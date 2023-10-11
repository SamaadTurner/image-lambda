const { S3 } = require('@aws-sdk/client-s3');

let s3client = new S3({ region: 'us-west-2' });

exports.handler = async (event) => {
  console.log('Lambda code is running!');
  const bucketName = event.Records[0].s3.bucket.name;
  const fileName = event.Records[0].s3.object.key;

  // Fetch existing images.json from S3, or initialize an empty array if it doesn't exist.
  let images = [];
  try {
    const data = await s3client.getObject({ Bucket: bucketName, Key: 'images.json' });
    images = JSON.parse(data.Body.toString());
  } catch (err) {
    if (err.code !== 'NoSuchKey') {
      console.error('Error fetching images.json:', err);
      throw err;
    }
  }

  // If the uploaded file is not images.json, then it's an image.
  // Update the images array with the metadata of the new image.
  if (fileName !== 'images.json') {
    const imageMetadata = {
      Name: fileName,
      Size: event.Records[0].s3.object.size,
      Type: fileName.split('.').pop(),
    };

    // If the image with the same name exists, update it, else add a new entry.
    const existingImageIndex = images.findIndex(img => img.Name === fileName);
    if (existingImageIndex > -1) {
      images[existingImageIndex] = imageMetadata;
    } else {
      images.push(imageMetadata);
    }

    // Re-upload the updated images.json back to S3
    await s3client.putObject({
      Bucket: bucketName,
      Key: 'images.json',
      Body: JSON.stringify(images),
      ContentType: 'application/json',
    });
  }

  // Return a response. Note: This is more useful if your Lambda is being used as an HTTP endpoint.
  // For an S3 trigger, the response won't be seen directly by end-users.
  const response = {
    statusCode: 200,
    body: JSON.stringify('Processed ' + fileName),
  };
  return response;
};