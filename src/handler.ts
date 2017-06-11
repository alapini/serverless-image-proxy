import * as AWS from 'aws-sdk'
import { getConfig, parseParams } from './parser'
import { callbackRuntime } from 'lambda-helpers'
import { APIGatewayEvent } from 'aws-lambda'
import { GraphQLClient } from 'graphql-request'
const sharp = require('sharp')

import 'source-map-support/register'

const s3 = new AWS.S3()

export default callbackRuntime(async (event: APIGatewayEvent) => {

  // NOTE currently needed for backward compatibility
  if (event.path.split('/')[1] !== 'v1') {

    try {
      // log projectId of projects using the old API version
      const client = new GraphQLClient(process.env.GRAPHCOOL_ENDPOINT, {
        headers: {
          Authorization: `Bearer ${process.env.GRAPHCOOL_PAT}`,
        }
      })

      await client.request(`mutation {
        createApiUser(projectId: "${event.path.split('/')[1]}") { id }
      }`)
    } catch (e) {
      if (e.response.errors[0].code !== 3010) {
        throw e
      }
    }

    return {
      statusCode: 301,
      headers: {
        'Location': `https://images.graph.cool/v1${event.path}`
      },
    }
  }

  const {projectId, fileSecret, crop, resize} = parseParams(event.path)

  const options = {
    Bucket: process.env.BUCKET_NAME,
    Key: `${projectId}/${fileSecret}`,
  }

  const {ContentLength, ContentType, ContentDisposition} = await s3.headObject(options).promise()

  if (ContentLength! > 25 * 1024 * 1024) {
    return {
      statusCode: 400,
      body: 'File too big',
    }
  }

  if (!ContentType!.includes('image')) {
    return {
      statusCode: 400,
      body: 'File not an image',
    }
  }

  const body = await (async () => {
    // return original for gifs, svgs or no params
    if (ContentType === 'image/gif' || ContentType === 'image/svg+xml' || (resize === undefined && crop === undefined)) {
      const obj = await s3.getObject(options).promise()
      return (obj.Body as Buffer).toString('base64')
    }


    const s3Resp = await s3.getObject(options).promise()
    const stream = sharp(s3Resp.Body)

    try {
      const config = getConfig({ resize, crop })

      stream.limitInputPixels(false)

      if (config.crop) {
        stream.extract({
          left: config.crop.x,
          top: config.crop.y,
          width: config.crop.width,
          height: config.crop.height,
        })
      }

      if (config.resize) {
        stream.resize(config.resize.width, config.resize.height)

        if (config.resize.force) {
          stream.ignoreAspectRatio()
        } else {
          stream.max()
        }
      }
    } catch (err) {
      return {
        statusCode: 400,
        body: err.toString(),
      }
    }

    const buf = await stream.toBuffer()

    return buf.toString('base64')
  })()

  return {
    statusCode: 200,
    headers: {
      'Content-Type': ContentType,
      'Content-Disposition': ContentDisposition,
      'Cache-Control': 'max-age=31536000',
    },
    body,
    isBase64Encoded: true,
  }
})
