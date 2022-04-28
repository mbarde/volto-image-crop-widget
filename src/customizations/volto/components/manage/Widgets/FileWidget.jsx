import { useRef, useState } from 'react';
import { Button, Modal } from 'semantic-ui-react';
// eslint-disable-next-line import/no-unresolved
import FileWidgetOrig from '@plone/volto-original/components/manage/Widgets/FileWidget';
import { Icon } from '@plone/volto/components';
import { flattenToAppURL } from '@plone/volto/helpers';
import checkSVG from '@plone/volto/icons/check.svg';
import cropSVG from '@plone/volto/icons/cut.svg';
import undoSVG from '@plone/volto/icons/undo.svg';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import './style.less';

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
  const [modalOpen, setModalOpen] = useState(false);

  const imgsrc = value?.download
    ? flattenToAppURL(value?.download) + '?id=' + Date.now()
    : null || value?.data
    ? `data:${value['content-type']};${value.encoding},${value.data}`
    : null;

  const onUndoCrop = (evt) => {
    onChange(id, value.history);
    evt.preventDefault();
  };

  const applyCrop = (evt) => {
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
    setModalOpen(false);
  };

  return (
    <div className="field-wrapper-image-container">
      {value?.history && (
        <Button className="btn-undo-crop" onClick={onUndoCrop}>
          <Icon name={undoSVG} size="20px" /> Undo cropping
        </Button>
      )}
      {imgsrc && (
        <Modal
          size="fullscreen"
          trigger={
            <Button
              className="btn-crop"
              onClick={(evt) => evt.preventDefault()}
            >
              <Icon name={cropSVG} size="20px"></Icon> Crop image
            </Button>
          }
          onClose={() => setModalOpen(false)}
          onOpen={() => setModalOpen(true)}
          open={modalOpen}
        >
          <Modal.Header>Crop image</Modal.Header>
          <Modal.Content image>
            <ReactCrop crop={crop} onChange={(c) => setCrop(c)}>
              <img src={imgsrc} ref={imgRef} alt="to crop" />
            </ReactCrop>
          </Modal.Content>
          <Modal.Actions>
            <Button onClick={() => setModalOpen(false)} negative>
              Cancel
            </Button>
            <Button icon onClick={applyCrop} positive>
              Apply <Icon name={checkSVG} size="14px" />
            </Button>
          </Modal.Actions>
        </Modal>
      )}
      <FileWidgetOrig {...props} />
    </div>
  );
};

export default FileWidget;
