# jQuery Plugin svg2img

The aim of this small jQuery plugin is to easy convert inline SVGs to standalone SVG image files without loosing styles:

```js
jQuery('#example-graph').svg2img();
```

There is one default option - you can redeclare it in the same way:

```js
jQuery.fn.svg2img.defaults = {
    debug: false // write debug information to console
};
```

You can also set the debug option at runtime:

```js
$('#example-graph').svg2img({debug:true})
```

You can download all SVGs from one page by setting the selector to the document, body or svg - as you like it. There is no need for a `each()` call, `svg2img` works on the whole selection and is chainable:

```js
$("svg").svg2img().css("border","1px solid red");
```

If you want to use an anchor to download the images, then it is a good idea to prevent the default action like so:

```html
Download
<a href="" onclick="event.preventDefault(); $('#example-graph').svg2img();">SVG file</a>.
```

There is a [online demo available][1].

One last thing: Safari has currently (as of this writing) problems with the underlaying `savAs()` implementation and tries to open the images in a new tab with or without success. See also this [issue][2].

UPDATE 2017-04-14: After update to macOS Sierra 10.12.4 Safari 10.1 works also - but is as slow as before - collecting CSS styles runs on my MacBook 2800ms in Safari, 20ms in Google Chrome :-(  
I stopped to support other image formats then SVG since the canvas export behind the scenes was not really working in too many browsers and the core feature was and is to convert inline SVGs to standalone SVG images.

[1]: https://ogobrecht.github.io/posts/2017-04-03-jquery-plugin-svg2img
[2]: https://github.com/eligrey/FileSaver.js/issues/267
