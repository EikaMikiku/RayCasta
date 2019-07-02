RayCasta.js
========

#### JavaScript Ray-Casting library ####

Rendering things like its 1992.

## Usage

Check [demo](https://eikamikiku.github.io/RayCasta/demo/) for usage.
<br>
To run demo locally, you need to serve files, otherwise browsers will complain about cross-origin issues.

In all objects constructor, parameter object is optional, default values shown below.

## Factory Object
```javascript
//Create factory object. It also stores context.
let rc = new RayCasta(context, {
    width: context.canvas.width, //Defaults to full canvas dimensions
    height: context.canvas.height
});
```

## Camera
```javascript
//Create our camera, where rays will originate from
let camera = rc.Camera({
    x: 0, //Camera position
    y: 0,
    dx: 1, //Where camera looks
    dy: 0
});
```

## AABB Object
```javascript
//Create walls, rectangles, aabbs, boxes w/e.
//Best to keep textures as squares, unless you really want distortions
let aabbs = [];
let img = document.getElementById("img"); //img should be loaded before use
for(let i = 0; i < 10; i++) {
    aabbs.push(
        rc.AABB(img, {
            x: 0, //AABB position
            y: 0,
            w: 50, //Dimensions
            h: 50
        })
    );
}
```

## Sprite Object
```javascript
//Create sprites
//Best to keep textures as squares, unless you really want distortions
let sprites = [];
let img = document.getElementById("img"); //img should be loaded before use
for(let i = 0; i < 10; i++) {
    sprites.push(
        rc.Sprite(img,{
            x: 0, //Sprite position
            y: 0
        })
    );
}
```

## Renderer Object
```javascript
//Setup renderer
let renderer = rc.Renderer({
    vertLineWidth: 3, //Amount of pixels per vertical stripe
    horLineWidth: 2, //Amount of pixels per horizontal line
    shadowDelta: 0.02, //Amount of shadow applied for further vertical stripes
    heightDelta: 20, //Height coefficient
});
```

## Then you can use renderer like so
```javascript
function loop() {
    ctx.clearRect(0, 0, w, h);
    camera.rotate(0.01);
    renderer.render(camera, aabbs, sprites);
    window.requestAnimationFrame(() => loop());
}
loop();
```
