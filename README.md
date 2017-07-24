# serverless-image-proxy
Resizes images using a Lambda function (aka Serverless Thumbor)

> Note: For this to work in a browser you have to add "*/*" to binary Media Types in API Gateway console.

## Notes

* Images are cropped before they are resized
* Cropping starts from left-top corner


## Syntax

> URL: `DOMAIN` **/** `VERSION` **/** `PROJECT_ID` **/** `FILE_SECRET` **/** [ `CROP` **/** ] `RESIZE` [  **/** `NAME` ]

### Resize

> Format: [ `X` ] **x** [ `Y` ]

* `500x300`: Fit into 500px x 300px rectangle
* `500x300!`: Forced resize
* `500x`: Resize to 500px width maintaining aspect ratio
* `x300`: Resize to 300px height maintaining aspect ratio
	
### Crop

> Format: `X` **x** `Y` **:** `WIDTH` **x** `HEIGHT`

* `0x0:400x400`: Crops the image taking the first 400x400 square

### Name

Name of image to improve indexing of images with search engines. 

Supported extensions: 

* png
* jpg
* jpeg
* svg
* gif
* bmp
* webp

## Development

Docker required to pre-build native NPM modules ([sharp](https://github.com/lovell/sharp)).

### Install

```sh
npm install --ignore-scripts
npm run prepare
serverless deploy
```
