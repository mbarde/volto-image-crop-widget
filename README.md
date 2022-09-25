# volto-image-crop-widget

Extends built-in FileWidget of [Volto](https://github.com/plone/volto) to be able to crop images in-place using [react-image-crop](https://www.npmjs.com/package/react-image-crop).

![Demo](https://github.com/mbarde/volto-image-crop-widget/raw/docs/docs/demo.gif)

### Why?

Users do not have to know & use external tools when they want to crop images.

## Setup

### Add volto-image-crop-widget to your Volto project

1. Make sure you have a [Plone backend](https://plone.org/download) up-and-running at http://localhost:8080/Plone

(for example via `docker run --name plone -p 8080:8080 -e SITE=Plone -e PROFILES="profile-plone.restapi:blocks" plone`)

2. Start Volto frontend

- If you already have a volto project, just update `package.json`:

  ```JSON
  "addons": [
      "@mbarde/volto-image-crop-widget"
  ],

  "dependencies": {
      "@mbarde/volto-image-crop-widget": "*"
  }
  ```

- If not, create one:

  ```
  npm install -g yo @plone/generator-volto
  yo @plone/volto my-volto-project --addon @mbarde/volto-image-crop-widget
  cd my-volto-project
  ```

3. Install new add-ons and restart Volto:

   ```
   yarn
   yarn start
   ```

4. Go to http://localhost:3000


## Configuration

### Enable and define aspect crops:

```Javascript
export default function applyConfig(config) {
  config.settings.image_crop_aspect_ratios = [
    {
      label: '16:9',
      ratio: 16 / 9,
    },
    {
      label: '4:3',
      ratio: 4 / 3,
    },
    {
      label: '1:1',
      ratio: 1,
    },
  ];
  return config;
}
```
