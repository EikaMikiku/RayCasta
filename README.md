RayCasta.js
========

#### JavaScript Ray-Casting library ####

Rendering things like its 1992.

### Usage ###

Check [demo](https://eikamikiku.github.io/RayCasta/demo/) for usage.
<br>
To run demo locally, you need to serve files, otherwise browsers will complain about cross-origin issues.

`RayCasta.Camera(params)`<b>:</b>
```javascript
//Create our camera, where rays will originate from
let camera = new RayCasta.Camera({
    x: 100, //Default 0
    y: 100, //Default 0
    width: canvas.width, //Mandatory
    height: canvas.height //Mandatory
});
```

`RayCasta.AABB(params)`<b>:</b>
```javascript
//Create walls, rectangles, aabbs, boxes w/e.
//Best to keep textures as squares, unless you really want distortions
let aabbs = [];
let img = document.getElementById("img"); //img should be loaded before use
for(let i = 0; i < 10; i++) {
    aabbs.push(
        new RayCasta.AABB({
            x: Math.random() * 300, //Default 0
            y: Math.random() * 300, //Default 0
            w: Math.random() * 100, //Default 50
            h: Math.random() * 100, //Default 50
            tex: img //Mandatory
        })
    );
}
```

`RayCasta.Sprite(params)`<b>:</b>
```javascript
//Create sprites
//Best to keep textures as squares, unless you really want distortions
let sprites = [];
let img = document.getElementById("img"); //img should be loaded before use
for(let i = 0; i < 10; i++) {
    sprites.push(new RayCasta.Sprite({
        x: Math.random() * 300, //Default 0
        y: Math.random() * 300, //Default 0
        tex: img //Mandatory
    }));
}
```

`RayCasta.Sprite(params)`<b>:</b>
```javascript
//Setup renderer
let renderer = new RayCasta({
    width: canvas.width, //Mandatory
    height: canvas.height, //Mandatory
    vertLineWidth: 3, //Default 3, Amount of pixels per vertical stripe
    horLineWidth: 2, //Default 2, Amount of pixels per horizontal line
    shadowDelta: 0.02, //Default 0.02, Amount of shadow applied for further vertical stripes.
    heightDelta: 20, //Default 20, Height coefficient.
});
```

Then you can use renderer like so<b>:</b>
```javascript
function loop() {
    ctx.clearRect(0, 0, w, h);
    camera.rotate(0.01);
    renderer.render(camera, ctx, aabbs, sprites);
    window.requestAnimationFrame(() => loop());
}
loop();
```
