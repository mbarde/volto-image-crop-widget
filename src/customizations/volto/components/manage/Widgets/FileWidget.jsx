import { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { Button, Modal } from 'semantic-ui-react';
// eslint-disable-next-line import/no-unresolved
import FileWidgetOrig from '@plone/volto-original/components/manage/Widgets/FileWidget';
import { Icon } from '@plone/volto/components';
import { flattenToAppURL } from '@plone/volto/helpers';
import config from '@plone/volto/registry';
import checkSVG from '@plone/volto/icons/check.svg';
import cropSVG from '@plone/volto/icons/cut.svg';
import horizontalSVG from '@plone/volto/icons/horizontal.svg';
import undoSVG from '@plone/volto/icons/undo.svg';
import verticalSVG from '@plone/volto/icons/vertical.svg';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import messages from '@mbarde/volto-image-crop-widget/messages';
import './style.less';

/* from original FileWidget */
const imageMimetypes = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/jpg',
  'image/gif',
  'image/svg+xml',
];

function flipImage(image, horizontally) {
  const width = image.naturalWidth;
  const height = image.naturalHeight;

  const scaleH = horizontally ? -1 : 1, // Set horizontal scale to -1 if flip horizontal
    scaleV = horizontally ? 1 : -1, // Set verical scale to -1 if flip vertical
    posX = horizontally ? width * -1 : 0, // Set x position to -100% if flip horizontal
    posY = horizontally ? 0 : height * -1; // Set y position to -100% if flip vertical

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.save(); // Save the current state
  ctx.scale(scaleH, scaleV); // Set scale to flip the image
  ctx.drawImage(image, posX, posY, width, height); // draw the image
  ctx.restore(); // Restore the last saved state

  const base64Image = canvas.toDataURL('image/jpeg');
  return base64Image;
}

function getCropAsBase64(image, pixelCrop) {
  /* crop selection is in image element dimensions, but the original image
     could be bigger (here: natural* vs. client*), we need to scale crop
     selection accordingly
     (based on: https://stackoverflow.com/a/52274005)
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
  const intl = useIntl();
  const imgRef = useRef(null);
  const [curAspectRatio, setCurAspectRatio] = useState(false);
  const [crop, setCrop] = useState();
  const [modalOpen, setModalOpen] = useState(false);
  const [isImage, setIsImage] = useState(false);

  useEffect(() => {
    if (value && imageMimetypes.includes(value['content-type'])) {
      setIsImage(true);
    }
  }, [value]);

  const imgsrc = value?.download
    ? flattenToAppURL(value?.download) + '?id=' + Date.now()
    : null || value?.data
    ? `data:${value['content-type']};${value.encoding},${value.data}`
    : null;
  const [imgSrc, setImgSrc] = useState(imgsrc);

  /* no need for our fancy new cropping options if file is not an image */
  if (!isImage) return <FileWidgetOrig {...props} />;

  const onUndoCrop = (evt) => {
    onChange(id, value.history);
    evt.preventDefault();
  };

  const applyChanges = (evt) => {
    onChange(id, {
      data: imgSrc.replace('data:image/jpeg;base64,', ''),
      encoding: 'base64',
      'content-type': 'image/jpeg',
      filename: value?.filename || 'changed.jpeg',
      history: value,
    });
    evt.preventDefault();
    setModalOpen(false);
  };

  const onFlip = (evt, horizontal) => {
    const data = flipImage(imgRef.current, horizontal);
    setImgSrc(data);
    setCrop();
    evt.preventDefault();
  };

  const onCrop = (evt) => {
    const data = getCropAsBase64(imgRef.current, crop);
    setImgSrc(data);
    setCrop();
    evt.preventDefault();
  };

  const initCrop = (newAspect) => {
    if (newAspect === false) {
      setCurAspectRatio(false);
      return;
    }

    if (imgRef?.current) {
      const { naturalWidth: width, naturalHeight: height } = imgRef.current;

      const crop = centerCrop(
        makeAspectCrop(
          {
            // You don't need to pass a complete crop into
            // makeAspectCrop or centerCrop.
            unit: '%',
            width: 50,
          },
          newAspect,
          width,
          height,
        ),
        width,
        height,
      );

      setCurAspectRatio(newAspect);
      setCrop(crop);
    }
  };

  const aspectRatios =
    config.settings.image_crop_aspect_ratios ||
    config.settings.image_crop_apect_ratios || // keep typo for compatibility
    [];

  return (
    <div className="field-wrapper-image-container">
      <div className="btn-wrapper">
        {value?.history && (
          <Button
            className="btn-undo-crop"
            onClick={onUndoCrop}
            title={intl.formatMessage(messages.undoCropping)}
          >
            <Icon name={undoSVG} size="20px" />
            <span>{intl.formatMessage(messages.undoCropping)}</span>
          </Button>
        )}
        {imgsrc && (
          <Modal
            size="fullscreen"
            trigger={
              <Button
                className="btn-crop"
                title={intl.formatMessage(messages.cropImage)}
                onClick={(evt) => evt.preventDefault()}
              >
                <Icon name={cropSVG} size="20px"></Icon>
                <span>{intl.formatMessage(messages.cropImage)}</span>
              </Button>
            }
            onClose={() => setModalOpen(false)}
            onOpen={() => setModalOpen(true)}
            open={modalOpen}
          >
            <Modal.Header>
              {intl.formatMessage(messages.cropImage)}
            </Modal.Header>
            <Modal.Content image>
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                aspect={curAspectRatio}
              >
                <img src={imgSrc} ref={imgRef} alt="to crop" />
              </ReactCrop>
            </Modal.Content>
            <Modal.Actions>
              <Button
                onClick={(evt) => {
                  onFlip(evt, true);
                }}
                aria-label={intl.formatMessage(messages.flipHorizontally)}
              >
                <Icon name={horizontalSVG} size="14px" />
              </Button>
              <Button
                onClick={(evt) => {
                  onFlip(evt, false);
                }}
                aria-label={intl.formatMessage(messages.flipVertically)}
              >
                <Icon name={verticalSVG} size="14px" />
              </Button>
              {aspectRatios.map((aspect, index) => {
                const isActive = aspect.ratio === curAspectRatio;
                return (
                  <Button
                    key={`ratio-${index}`}
                    active={isActive}
                    onClick={() => {
                      if (isActive) initCrop(false);
                      else initCrop(aspect.ratio);
                    }}
                  >
                    {aspect.label}
                  </Button>
                );
              })}
              <Button icon onClick={onCrop} disabled={!crop}>
                {intl.formatMessage(messages.crop)}
              </Button>
              <Button onClick={applyChanges} positive>
                {intl.formatMessage(messages.apply)}{' '}
                <Icon name={checkSVG} size="14px" />
              </Button>
            </Modal.Actions>
          </Modal>
        )}
      </div>
      <FileWidgetOrig {...props} />
    </div>
  );
};

export default FileWidget;
