function RayCasta(context, params) {
	if(!params) params = {};

	this.WIDTH = params.width || context.canvas.width;
	this.HEIGHT = params.height || context.canvas.height;
	this.context = context;
}

(function(rc) {
	///////////////////////////////
	//AABB/////////////////////////
	///////////////////////////////
	function AABB(texture, params) {
		this.x = params.x || 0;
		this.y = params.y || 0;
		this.w = params.w || 50;
		this.h = params.h || 50;
		this.ex = this.x + this.w;
		this.ey = this.y + this.h;

		if(!texture) {
			throw "'texture' parameter is mandatory";
		}

		this.texture = texture;
		this.textureData = getImageData(this.texture);
	}

	rc.AABB = function(texture, params) {
		return new AABB(texture, params || {});
	};
	///////////////////////////////
	//Sprite///////////////////////
	///////////////////////////////
	function Sprite(texture, params) {
		this.x = params.x || 0;
		this.y = params.y || 0;

		if(!texture) {
			throw "'texture' parameter is mandatory";
		}

		this.texture = texture;
		this.textureData = getImageData(this.texture);
	}

	rc.Sprite = function(texture, params) {
		return new Sprite(texture, params || {});
	};
	///////////////////////////////
	//Camera///////////////////////
	///////////////////////////////
	function Camera(params, rcInstance) {
		this.x = params.x || 0;
		this.y = params.y || 0;
		this.dx = params.dx || 1;
		this.dy = params.dy || 0;
		this.px = 0;
		this.py = rcInstance.WIDTH / rcInstance.HEIGHT / 2;
	}

	Camera.prototype.rotate = function(amount, anticlockwise) {
		let c = Math.cos(anticlockwise ? -amount : amount);
		let s = Math.sin(anticlockwise ? -amount : amount);

		let oldDirX = this.dx;
		let oldPlaneX = this.px;
		this.dx = this.dx * c - this.dy * s;
		this.dy = oldDirX * s + this.dy * c;
		this.px = this.px * c - this.py * s;
		this.py = oldPlaneX * s + this.py * c;
	};

	rc.Camera = function(params) {
		return new Camera(params || {}, this);
	};
	///////////////////////////////
	//Renderer/////////////////////
	///////////////////////////////
	function Renderer(params, rcInstance) {
		this.HEIGHT_MODIFIER = params.heightDelta || 20;
		this.SHADOW_MODIFIER = params.shadowDelta || 0.02;
		this.STRIPE_WIDTH = params.vertLineWidth || 3;
		this.LINE_WIDTH = params.horLineWidth || 2;
		this.processPixelColor = params.processPixelColorFunc || processPixelColor;

		this.rcInstance = rcInstance;

		if(this.rcInstance.WIDTH % this.STRIPE_WIDTH !== 0) {
			throw "Canvas width not divisible by vertLineWidth(" + this.STRIPE_WIDTH + ")";
		}

		this.__zBuffer = new Float32Array(this.rcInstance.WIDTH);
		this.__cameraLookup = new Float32Array(this.rcInstance.WIDTH);
		for(let x = 0; x < this.rcInstance.WIDTH; x++) {
			this.__cameraLookup[x] = 2 * x / this.rcInstance.WIDTH - 1;
		}
	}

	Renderer.prototype.render = function(camera, aabbs, sprites) {
		let imageData = this.rcInstance.context.getImageData(0, 0, this.rcInstance.WIDTH, this.rcInstance.HEIGHT);
		let buffer = imageData.data;
		let rayData = {
			ox: camera.x,
			oy: camera.y
		};

		//Rendering aabbs
		for(let x = 0; x < this.rcInstance.WIDTH; x += this.STRIPE_WIDTH) {
			let cameraX = this.__cameraLookup[x];
			rayData.dx = camera.dx + camera.px * cameraX;
			rayData.dy = camera.dy + camera.py * cameraX;

			let dist = Infinity;
			let side = null;
			let hitAABB = null;
			for(let i = 0; i < aabbs.length; i++) {
				let aabb = aabbs[i];
				if(getDistance(rayData, aabb) && rayData.dist < dist) {
					dist = rayData.dist;
					side = rayData.side;
					hitAABB = aabb;
				}
			}

			//Update zBuffer stripe width pixel area with distance
			for(let i = 0; i < this.STRIPE_WIDTH; i++) {
				this.__zBuffer[x + i] = dist;
			}

			//Move to next stripe
			if(!hitAABB) {
				continue;
			}

			let lineHeight = ~~(this.HEIGHT_MODIFIER * this.rcInstance.HEIGHT / dist);
			let drawStart = ~~((this.rcInstance.HEIGHT - lineHeight) / 2);
			let drawOffset = drawStart % this.LINE_WIDTH;
			drawStart -= drawOffset; //Make sure we start drawing on the correct line
			let drawEnd = ~~((this.rcInstance.HEIGHT + lineHeight) / 2) - drawOffset;
			if(drawStart < 0) {
				drawStart = 0;
			}
			if(drawEnd > this.rcInstance.HEIGHT) {
				drawEnd = this.rcInstance.HEIGHT;
			}

			let tex = hitAABB.texture;
			//Note, this ignores width, assumes all textures are squares
			let texSize = hitAABB.texture.height;

			//Make sure texture starts on the leftmost position on each side
			let texOffset;
			if(side === 0) {
				texOffset = texSize * Math.abs(hitAABB.ex - (rayData.ox + rayData.dx * dist));
			} else if(side === 1) {
				texOffset = texSize * Math.abs(hitAABB.ey - (rayData.oy + rayData.dy * dist));
			} else if(side === 2) {
				texOffset = texSize * Math.abs(hitAABB.x - (rayData.ox + rayData.dx * dist));
			} else if(side === 3) {
				texOffset = texSize * Math.abs(hitAABB.y - (rayData.oy + rayData.dy * dist));
			}

			let texActualOffset = ~~(texOffset / this.HEIGHT_MODIFIER % texSize);
			for(let y = drawStart; y < drawEnd; y += this.LINE_WIDTH) {
				let texY = ((y * 2 - this.rcInstance.HEIGHT + lineHeight) * texSize) / (lineHeight * 2);
				let color = hitAABB.textureData[texSize * ~~(texY) + texActualOffset];
				if(!color) {
					continue; //Ignore subpixels
				}
				let r = this.processPixelColor(hitAABB, color[0], dist, this.SHADOW_MODIFIER);
				let g = this.processPixelColor(hitAABB, color[1], dist, this.SHADOW_MODIFIER);
				let b = this.processPixelColor(hitAABB, color[2], dist, this.SHADOW_MODIFIER);

				for(let x2 = 0; x2 < this.STRIPE_WIDTH; x2++) {
					for(let y2 = 0; y2 < this.LINE_WIDTH; y2++) {
						i = 4 * (this.rcInstance.WIDTH * (y + y2)) + 4 * (x + x2);
						buffer[i + 0] = r;
						buffer[i + 1] = g;
						buffer[i + 2] = b;
						buffer[i + 3] = 255;
					}
				}
			}
		}

		//Sorting sprites by euclidian distance
		for(let s = 0; s < sprites.length; s++) {
			let sprite = sprites[s];
			sprite.__distance = (rayData.ox - sprite.x) * (rayData.ox - sprite.x) + (rayData.oy - sprite.y) * (rayData.oy - sprite.y);
		}
		sprites.sort((a, b) => {
			return b.__distance - a.__distance;
		});

		let invDet = 1 / (camera.px * camera.dy - camera.dx * camera.py);
		for(let s = 0; s < sprites.length; s++) {
			let sprite = sprites[s];
			let spriteX = sprite.x - rayData.ox;
			let spriteY = sprite.y - rayData.oy;
			let transformX = invDet * (camera.dy * spriteX - camera.dx * spriteY);
			let transformY = invDet * (-camera.py * spriteX + camera.px * spriteY);
			let spriteScreenX = ~~((this.rcInstance.WIDTH / 2) * (1 + transformX / transformY));

			let spriteSize = Math.abs(this.HEIGHT_MODIFIER * this.rcInstance.HEIGHT / (transformY));
			let drawStartY = Math.round(-spriteSize / 2 + this.rcInstance.HEIGHT / 2);
			let drawEndY = Math.round(spriteSize / 2 + this.rcInstance.HEIGHT / 2);
			let drawStartX = Math.round(-spriteSize / 2 + spriteScreenX);
			let drawEndX = Math.round(spriteSize / 2 + spriteScreenX);

			if(transformY <= 0 || drawStartX > this.rcInstance.WIDTH || drawEndX < 0) {
				continue;
			}
			if(drawStartX < 0) {
				drawStartX = 0;
			}
			if(drawEndX > this.rcInstance.WIDTH) {
				drawEndX = this.rcInstance.WIDTH;
			}
			if(drawStartY < 0) {
				drawStartY = 0;
			}
			if(drawEndY > this.rcInstance.HEIGHT) {
				drawEndY = this.rcInstance.HEIGHT;
			}

			//Need to adjust drawStartX
			//if its not a first line of the sprite (i.e. there is a wall)
			//if the wall is behind the sprite, dont do this
			//This is same thing as remainedWidth below, but if the wall is on the other side
			if(isFinite(this.__zBuffer[drawStartX]) && this.__zBuffer[drawStartX] < transformY) {
				drawStartX -= drawStartX % this.STRIPE_WIDTH;
			}

			for(let stripe = drawStartX; stripe < drawEndX; stripe += this.STRIPE_WIDTH) {
				//the conditions in the if are:
				//1) it's in front of camera plane so you don't render things behind you
				//2) it's on the screen (left)
				//3) it's on the screen (right)
				//4) ZBuffer, with perpendicular distance
				if(stripe >= 0 && stripe < this.rcInstance.WIDTH && transformY < this.__zBuffer[stripe]) {
					let texX = ~~((stripe - (-spriteSize / 2 + spriteScreenX)) * sprite.texture.width / spriteSize);

					//We are ok do draw on this strip, however the remaining allowed width might be less than STRIP_WIDTH
					//So we need to check how much width is remaining by checking zBuffer
					let remainedWidth = 1;
					for(let i = 1; i < this.STRIPE_WIDTH; i++) {
						if(transformY < this.__zBuffer[stripe + i]) {
							remainedWidth++;
						}
					}

					for(let y = drawStartY; y < drawEndY; y += this.LINE_WIDTH) {
						let d = y * 2 - this.rcInstance.HEIGHT + spriteSize;
						let texY = ((d * sprite.texture.height) / spriteSize) / 2;
						let color = sprite.textureData[sprite.texture.width * ~~(texY) + texX];
						if(!color) {
							continue;
						}
						if(color[3] !== 0) {
							for(let x1 = 0; x1 < remainedWidth; x1++) {
								for(let y1 = 0; y1 < this.LINE_WIDTH; y1++) {
									let i = 4 * (this.rcInstance.WIDTH * (y + y1)) + 4 * (stripe + x1);
									buffer[i + 0] = this.processPixelColor(sprite, color[0], transformY, this.SHADOW_MODIFIER);
									buffer[i + 1] = this.processPixelColor(sprite, color[1], transformY, this.SHADOW_MODIFIER);
									buffer[i + 2] = this.processPixelColor(sprite, color[2], transformY, this.SHADOW_MODIFIER);
									buffer[i + 3] = color[3];
								}
							}
						}
					}
				}
			}
		}

		//Put imageData into context with updated buffer
		this.rcInstance.context.putImageData(imageData, 0, 0);
	};

	rc.Renderer = function(params) {
		return new Renderer(params || {}, this);
	};
	///////////////////////////////
	//Utility functions////////////
	///////////////////////////////
	function getDistance(rayData, aabb) {
		let lo = -Infinity;
		let hi = +Infinity;
		let lookingRight = true;
		let lookingDown = true;
		let lookingSide = true;

		//Dimension 1
		let dimLo = (aabb.x - rayData.ox) / rayData.dx;
		let dimHi = (aabb.ex - rayData.ox) / rayData.dx;

		if(dimLo > dimHi) {
			let tmp = dimLo;
			dimLo = dimHi;
			dimHi = tmp;
			lookingRight = false;
		}

		if(dimHi < lo || dimLo > hi) {
			return null;
		}

		if(dimLo > lo) {
			lo = dimLo;
		}
		if(dimHi < hi) {
			hi = dimHi;
		}

		//Dimension 2
		dimLo = (aabb.y - rayData.oy) / rayData.dy;
		dimHi = (aabb.ey - rayData.oy) / rayData.dy;

		if(dimLo > dimHi) {
			let tmp = dimLo;
			dimLo = dimHi;
			dimHi = tmp;
			lookingDown = false;
		}

		if(dimHi < lo || dimLo > hi) {
			return null;
		}

		if(dimLo > lo) {
			lookingSide = false;
			lo = dimLo;
		}
		if(dimHi < hi) {
			hi = dimHi;
		}

		/*
		 * 0 = top
		 * 1 = right
		 * 2 = bottom
		 * 3 = left
		*/
		let side = null;
		if(lookingSide) {
			if(lookingRight) {
				side = 3;
			} else {
				side = 1;
			}
		} else {
			if(lookingDown) {
				side = 0;
			} else {
				side = 2;
			}
		}
		//Result
		let dist = lo > hi ? null : lo;
		if(dist && dist > 0) {
			rayData.dist = dist;
			rayData.side = side;
			return true; //Hit
		} else {
			return null;
		}
	}

	function processPixelColor(obj, color, dist, shadowDelta) {
		let newColor = color / (dist * shadowDelta);
		return newColor > color ? color : newColor;
	}

	function getImageData(tex) {
		let canvas = document.createElement("canvas");
		let ctx = canvas.getContext("2d");
		canvas.width = tex.width;
		canvas.height = tex.height;
		ctx.clearRect(0, 0, tex.width, tex.height);
		ctx.drawImage(tex, 0, 0);
		let imageData = ctx.getImageData(0, 0, tex.width, tex.height);
		let rgbArray = new Array(tex.width * tex.height);
		for(let i = 0; i < tex.width * tex.height; i++) {
			rgbArray[i] = new Uint8Array([
				imageData.data[4 * i ],
				imageData.data[4 * i + 1],
				imageData.data[4 * i + 2],
				imageData.data[4 * i + 3]
			]);
		}
		return rgbArray;
	};
})(RayCasta.prototype);