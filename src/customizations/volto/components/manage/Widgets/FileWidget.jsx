import { useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Button, Label, Modal } from 'semantic-ui-react';
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
import warnSVG from '@plone/volto/icons/warning.svg';
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

function adjustImageBrightness(image, brightnessValue) {
  const canvas = document.createElement('canvas');
  canvas.height = image.naturalHeight;
  canvas.width = image.naturalWidth;
  const ctx = canvas.getContext('2d');

  ctx.filter = `brightness(${brightnessValue}%)`;
  ctx.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight);

  const base64Image = canvas.toDataURL('image/jpeg');
  return base64Image;
}

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
  const [warnModalOpen, setWarnModalOpen] = useState(false);
  const [isImage, setIsImage] = useState(false);
  const [history, setHistory] = useState([]);
  const [brightness, setBrightness] = useState(100); // in %

  useEffect(() => {
    if (value && imageMimetypes.includes(value['content-type'])) {
      setIsImage(true);
    }
    /* when a new image has been uploaded
       value.download does not exist yet */
    const imgsrc = value?.download
      ? flattenToAppURL(value?.download) + '?id=' + Date.now()
      : value?.data
      ? `data:${value['content-type']};${value.encoding},${value.data}`
      : null;
    setImgSrc(imgsrc);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [value, value?.download, value?.data]);

  const [imgSrc, setImgSrc] = useState(null);

  /* no need for our fancy new cropping options if file is not an image */
  if (!isImage) return <FileWidgetOrig {...props} />;

  const onUndo = (evt) => {
    if (history.length > 0) {
      setImgSrc(history[0]);
      setHistory(history.slice(1));
    }
    evt.preventDefault();
  };

  const applyChanges = (evt) => {
    const data =
      brightness === 100
        ? imgSrc
        : adjustImageBrightness(imgRef.current, brightness);
    onChange(id, {
      data: data.replace('data:image/jpeg;base64,', ''),
      encoding: 'base64',
      'content-type': 'image/jpeg',
      filename: value?.filename || 'changed.jpeg',
      history: value,
    });
    evt.preventDefault();
    setModalOpen(false);
    setWarnModalOpen(false);
  };

  const onFlip = (evt, horizontal) => {
    setHistory((history) => [imgSrc, ...history]);
    const data = flipImage(imgRef.current, horizontal);
    setImgSrc(data);
    setCrop();
    evt.preventDefault();
  };

  const onCrop = (evt) => {
    setHistory((history) => [imgSrc, ...history]);
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
        {imgSrc && (
          <Modal
            className="modal-image-crop"
            closeIcon
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
                <img
                  /* Modifying `imgSrc` directly when brightness changes,
                     could easily result in data loss on extreme bright
                     or dark values. Instead we visualize these changes
                     only via CSS and compute actual data only on apply.
                  */
                  style={{ filter: `brightness(${brightness}%)` }}
                  src={imgSrc}
                  ref={imgRef}
                  alt="to crop"
                />
              </ReactCrop>
            </Modal.Content>
            <Modal.Actions>
              {history && history.length > 0 && (
                <Button
                  icon
                  className="btn-undo"
                  onClick={onUndo}
                  title={intl.formatMessage(messages.undo)}
                  secondary
                >
                  <Icon name={undoSVG} size="14px" />
                  <span>{intl.formatMessage(messages.undo)}</span>
                </Button>
              )}
              <Button.Group>
                <Button
                  icon="plus"
                  onClick={() => {
                    setBrightness(brightness + 10);
                  }}
                  title={intl.formatMessage(messages.lighten)}
                  aria-label={intl.formatMessage(messages.lighten)}
                />
                <Button as="div" labelPosition="left">
                  <Label
                    className="brightness"
                    basic
                    title={intl.formatMessage(messages.brightness)}
                  >
                    {brightness + '%'}
                  </Label>
                  <Button
                    icon="minus"
                    onClick={() => {
                      setBrightness(brightness - 10);
                    }}
                    title={intl.formatMessage(messages.darken)}
                    aria-label={intl.formatMessage(messages.darken)}
                  />
                </Button>
              </Button.Group>
              <Button.Group>
                <Button
                  icon
                  onClick={(evt) => {
                    onFlip(evt, true);
                  }}
                  title={intl.formatMessage(messages.flipHorizontally)}
                  aria-label={intl.formatMessage(messages.flipHorizontally)}
                >
                  <Icon name={horizontalSVG} size="14px" />
                </Button>
                <Button
                  icon
                  onClick={(evt) => {
                    onFlip(evt, false);
                  }}
                  title={intl.formatMessage(messages.flipVertically)}
                  aria-label={intl.formatMessage(messages.flipVertically)}
                >
                  <Icon name={verticalSVG} size="14px" />
                </Button>
              </Button.Group>
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
              <Button icon onClick={onCrop} disabled={!crop} positive>
                <Icon name={cropSVG} size="14px"></Icon>{' '}
                {intl.formatMessage(messages.crop)}
              </Button>
              <Button
                icon
                onClick={() => setWarnModalOpen(true)}
                disabled={history.length === 0 && brightness === 100}
                positive
              >
                <Icon name={checkSVG} size="14px" />{' '}
                {intl.formatMessage(messages.apply)}
              </Button>
            </Modal.Actions>
            <Modal
              onClose={() => setWarnModalOpen(false)}
              open={warnModalOpen}
              size="small"
              centered={true}
            >
              <Modal.Header>
                <Icon name={warnSVG} /> {intl.formatMessage(messages.warning)}
              </Modal.Header>
              <Modal.Content>
                <p>{intl.formatMessage(messages.hint_save_after_crop)}</p>
              </Modal.Content>
              <Modal.Actions>
                <Button primary content="Understood" onClick={applyChanges} />
              </Modal.Actions>
            </Modal>
          </Modal>
        )}
      </div>
      <FileWidgetOrig {...props} />
    </div>
  );
};

export default FileWidget;
