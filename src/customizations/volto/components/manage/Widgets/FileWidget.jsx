import { useRef, useState } from 'react';
// eslint-disable-next-line import/no-unresolved
import FileWidgetOrig from '@plone/volto-original/components/manage/Widgets/FileWidget';
import { flattenToAppURL } from '@plone/volto/helpers';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

function getCropAsBase64(image, pixelCrop) {
  /* crop selection is in image element dimensions, but the original image
     could be bigger (here: natural* vs. client*), we need to scale crop
     selection accordingly
     (https://stackoverflow.com/a/52274005)
  */
  const fx = image.naturalWidth / image.clientWidth;
  const fy = image.naturalHeight / image.clientHeight;
  const cropX = pixelCrop.x * fx;
  const cropY = pixelCrop.y * fy;
  const cropWidth = pixelCrop.width * fx;
  const cropHeight = pixelCrop.height * fy;

  const canvas = document.createElement('canvas');
  canvas.width = cropWidth;
  canvas.height = cropHeight;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(
    image,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight,
  );

  const base64Image = canvas.toDataURL('image/jpeg');
  return base64Image;
}

const FileWidget = (props) => {
  const { id, value, onChange } = props;
  const imgRef = useRef(null);
  const [crop, setCrop] = useState();

  const imgsrc = value?.download
    ? flattenToAppURL(value?.download) + '?id=' + Date.now()
    : null || value?.data
    ? `data:${value['content-type']};${value.encoding},${value.data}`
    : null;

  const onUndoCrop = (evt) => {
    onChange(id, value.history);
    evt.preventDefault();
  };

  const onGetCropped = (evt) => {
    const data = getCropAsBase64(imgRef.current, crop, 'cropped.jpg').replace(
      'data:image/jpeg;base64,',
      '',
    );
    onChange(id, {
      data: data,
      encoding: 'base64',
      'content-type': 'image/jpeg',
      filename: value?.filename || 'cropped.jpeg',
      history: value,
    });
    setCrop();
    evt.preventDefault();
  };

  return (
    <>
      <button onClick={onGetCropped}>Crop</button>
      {value?.history && <button onClick={onUndoCrop}>Undo cropping</button>}
      {imgsrc && (
        <ReactCrop crop={crop} onChange={(c) => setCrop(c)}>
          <img src={imgsrc} ref={imgRef} alt="to crop" />
        </ReactCrop>
      )}
      <FileWidgetOrig {...props} />
    </>
  );
};

export default FileWidget;
