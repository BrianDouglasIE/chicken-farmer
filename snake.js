const SCREEN_SCALE = 4
const SPRITE_SIZE = 16
const GRID_ROWS = 10
const GRID_COLS = 10
const SCREEN_WIDTH = SPRITE_SIZE * GRID_COLS
const SCREEN_HEIGHT = SPRITE_SIZE * GRID_ROWS
const VIRTUAL_SPRITE_SIZE = SPRITE_SIZE * SCREEN_SCALE
const VIRTUAL_SCREEN_WIDTH = SCREEN_WIDTH * SCREEN_SCALE
const VIRTUAL_SCREEN_HEIGHT = SCREEN_HEIGHT * SCREEN_SCALE

let egg
let farmerSprite
let farmerFacingLeftSprite
let farmerSpriteRed
let chickenSprite
let chickenFacingLeftSprite
let eggSprite
let duckEggSprite
let duckSprite
let duckFacingLeftSprite

const farmerSound = new Audio('farmer.mp3')
const duckSound = new Audio('duck.mp3')
const chickenSound = new Audio('chicken.mp3')

let gameInProgress = true
const updateInterval = 0.33
let updateTimer = 0
let lastTime = 0

const keys = {}
window.addEventListener('keydown', e => keys[e.key] = true)

const canvasContainer = document.getElementById('canvasContainer')
canvasContainer.style.width = `${VIRTUAL_SCREEN_WIDTH}px`
canvasContainer.style.height = `${VIRTUAL_SCREEN_HEIGHT}px`

const canvas = document.createElement('canvas')
canvas.width = SCREEN_WIDTH
canvas.height = SCREEN_HEIGHT
canvas.style.width = `${VIRTUAL_SCREEN_WIDTH}px`
canvas.style.height = `${VIRTUAL_SCREEN_HEIGHT}px`
canvas.style.imageRendering = 'pixelated'
canvasContainer.appendChild(canvas)
window.addEventListener('load', () => canvas.focus())

const menuCanvas = document.createElement('canvas')
menuCanvas.width = VIRTUAL_SCREEN_WIDTH
menuCanvas.height = VIRTUAL_SCREEN_HEIGHT
canvasContainer.appendChild(menuCanvas)

const ctx = canvas.getContext('2d')
const menuCanvasCtx = menuCanvas.getContext('2d')

const spritesheet = new Image()
spritesheet.crossOrigin = 'anonymous'
spritesheet.src = 'spritesheet.png'
spritesheet.addEventListener('load', spritesheetLoaded, false)

let player = createPlayer()

function initPlayer() {
	player = createPlayer()
	const initialPlayerX = 5
	const initialPlayerY = 4
	const initialPlayerCellCount = 4
	for(let i = 0; i < initialPlayerCellCount; i++) {
		const cell = createPlayerCell()
		cell.position.x = initialPlayerX - i
		cell.position.y = initialPlayerY
		cell.orientation.x = 1
		cell.orientation.y = 0
		player.cells.push(cell)
	}
}

function getSprite(ctx, x, y) {
	return ctx.getImageData(SPRITE_SIZE * x, SPRITE_SIZE * y, SPRITE_SIZE, SPRITE_SIZE)
}

function drawSprite(ctx, sprite, x, y) {
	ctx.putImageData(sprite, x, y, 0, 0, VIRTUAL_SPRITE_SIZE, VIRTUAL_SPRITE_SIZE);
}

function spritesheetLoaded() {
	const spritesheetCanvas = document.createElement('canvas')
	spritesheetCanvas.width = spritesheet.width
	spritesheetCanvas.height = spritesheet.height
	const spritesheetCtx = spritesheetCanvas.getContext('2d', {willReadFrequently: true})
	spritesheetCtx.drawImage(spritesheet, 0, 0)

	farmerSprite = applyColorMaskToImageData(spritesheetCtx, getSprite(spritesheetCtx, 0, 0), [0, 100, 255, 255])
	farmerSpriteRed = applyColorMaskToImageData(spritesheetCtx, getSprite(spritesheetCtx, 0, 0), [255, 0, 0, 255])
	farmerFacingLeftSprite = flipImageDataHorizontally(spritesheetCtx, farmerSprite)
	chickenSprite = applyColorMaskToImageData(spritesheetCtx, getSprite(spritesheetCtx, 0, 1), [255, 200, 0, 255])
	chickenFacingLeftSprite = flipImageDataHorizontally(spritesheetCtx, chickenSprite)
	duckSprite = applyColorMaskToImageData(spritesheetCtx, getSprite(spritesheetCtx, 1, 0), [255, 200, 150, 255])
	duckFacingLeftSprite = flipImageDataHorizontally(spritesheetCtx, duckSprite)
	eggSprite = getSprite(spritesheetCtx, 1, 1)
	duckEggSprite = applyColorMaskToImageData(spritesheetCtx, eggSprite, [200, 255, 200, 255])
	
	initPlayer()
	gameloop()
}

function createEgg() {
	return { duck: Math.random() < .25, position: { x: 0, y: 0}, lifeSpan: .3 }
}

function placeEgg() {
	egg = createEgg()
	const freeCells = getFreeCells()
	if(freeCells.length) {
		cell = freeCells[Math.floor(Math.random() * freeCells.length)]
		egg.position.x = cell.x
		egg.position.y = cell.y
	}
}

function createPlayerCell() {
	return {
		type: 0,
		position: { x: 0, y: 0},
		orientation: { x: 0, y: 0},
	}
}

function createPlayer() {
	return { cells: [] }
}

function getFreeCells() {
	const gameObjects = player.cells.map(({ position }) => `${position.x},${position.y}`);
	if (egg) gameObjects.push(egg.position);

	const occupied = new Set(gameObjects);

	const freeCells = [];
	for (let i = 0; i < GRID_COLS; i++) {
		for (let j = 0; j < GRID_ROWS; j++) {
			if (!occupied.has(`${i},${j}`)) {
				freeCells.push({ x: i, y: j });
			}
		}
	}

	return [...freeCells];
}

function playerWillCollideWithOwnCell(player) {
	const gameObjects = player.cells.slice(1).map(({ position }) => `${position.x},${position.y}`);
	const occupied = new Set(gameObjects);
	const head = player.cells[0]
	return occupied.has(`${head.position.x + head.orientation.x},${head.position.y + head.orientation.y}`)
}

function processPlayerInput() {
	const head = player.cells[0]
	if(keys['ArrowUp']) {
		if(head.orientation.y !== 1) {
			head.orientation.y = -1
			head.orientation.x = 0
		}
		return
	}
	if(keys['ArrowDown']) {
		if(head.orientation.y !== -1) {
			head.orientation.y = 1
			head.orientation.x = 0
		}
		return
	}
	if(keys['ArrowLeft']) {
		if(head.orientation.x !== 1) {
			head.orientation.y = 0
			head.orientation.x = -1
		}
		return
	}
	if(keys['ArrowRight']) {
		if(head.orientation.x !== -1) {
			head.orientation.y = 0
			head.orientation.x = 1
		}
		return
	}
}

function cloneImageData(imageData) {
	const data = new Uint8ClampedArray(imageData.data)
	return new ImageData(data, imageData.width, imageData.height)
}

function applyColorMaskToImageData(ctx, imageData, maskColor) {
	const copy = cloneImageData(imageData)
	const { data } = copy
	const [maskR, maskG, maskB, maskA] = maskColor;

	for (let i = 0; i < data.length; i += 4) {
		const r = data[i];
		const g = data[i + 1];
		const b = data[i + 2];
		const a = data[i + 3];

		data[i] = (r * maskR) / 255;
		data[i + 1] = (g * maskG) / 255;
		data[i + 2] = (b * maskB) / 255;
		data[i + 3] = (a * maskA) / 255;
	}

	return copy
}

function flipImageDataHorizontally(ctx, imageData) {
	const copy = cloneImageData(imageData)
	const { width, height, data } = copy;
	const flippedData = new Uint8ClampedArray(data.length);

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const srcIndex = (y * width + x) * 4;
			const destIndex = (y * width + (width - x - 1)) * 4;

			flippedData[destIndex] = data[srcIndex];
			flippedData[destIndex + 1] = data[srcIndex + 1];
			flippedData[destIndex + 2] = data[srcIndex + 2];
			flippedData[destIndex + 3] = data[srcIndex + 3];
		}
	}

	return new ImageData(flippedData, width, height);
}

function drawCenteredText(ctx, text, container) {
	const measuredText = ctx.measureText(text)
	ctx.save()
	ctx.font = "24px monospace";
	ctx.fillStyle = 'black'
	ctx.translate(container.x, container.y)
	ctx.fillText(text, (container.width / 2) - measuredText.width * 1.5,  container.height / 2)
	ctx.restore()
}

function gameloop(frame) {
	requestAnimationFrame(gameloop)

	let deltaTime = 0
	if(!isNaN(frame)) {
		deltaTime = (frame - lastTime) / 1000;
		lastTime = frame;
		updateTimer += deltaTime
	}
	
	if(keys['r'] && !gameInProgress) {
		initPlayer()
		gameInProgress = true
		menuCanvasCtx.clearRect(0, 0, VIRTUAL_SCREEN_WIDTH, VIRTUAL_SCREEN_HEIGHT)
		return
	}
	
	if(updateTimer < updateInterval || !gameInProgress) return
	updateTimer = 0

	processPlayerInput()
	gameInProgress = !playerWillCollideWithOwnCell(player)

	if(gameInProgress) {
		ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT)

		if(egg) {
			drawSprite(ctx, egg.duck ? duckEggSprite : eggSprite, egg.position.x * SPRITE_SIZE, egg.position.y * SPRITE_SIZE)
			egg.lifeSpan -= deltaTime

			if(egg.lifeSpan <= 0) {
				egg = undefined
			}
		} else if(Math.random() < .2) {
			placeEgg()
		}

		const head = player.cells[0]
		for(let i = player.cells.length - 1; i > 0; i--) {
			const curr = player.cells[i]
			const prev = player.cells[i-1]
			curr.position.x = prev.position.x
			curr.position.y = prev.position.y
			curr.orientation.x = prev.orientation.x
			curr.orientation.y = prev.orientation.y

			let sprite = curr.orientation.x === -1 ? chickenFacingLeftSprite : chickenSprite
			if(curr.type === 1) {
				sprite = curr.orientation.x === -1 ? duckFacingLeftSprite : duckSprite
			}
			
			drawSprite(ctx, sprite, curr.position.x * SPRITE_SIZE, curr.position.y * SPRITE_SIZE)
		}

		head.position.x += head.orientation.x
		head.position.y += head.orientation.y

		if(head.position.x > GRID_COLS - 1) head.position.x = 0
		if(head.position.x < 0) head.position.x = GRID_COLS - 1
		if(head.position.y > GRID_ROWS - 1) head.position.y = 0
		if(head.position.y < 0) head.position.y = GRID_ROWS - 1

		if(egg && (head.position.x === egg.position.x && head.position.y === egg.position.y)) {
			const newCell = createPlayerCell()
			const tail = player.cells[player.cells.length - 1]
			newCell.position.x = tail.position.x
			newCell.position.y = tail.position.y

			newCell.type = egg.duck ? 1 : 0
		
			if(egg.duck) {
				duckSound.play()
			} else {
				chickenSound.play()
			}
		
			player.cells.push(newCell)

			egg = undefined
		}

		if(head.orientation.x === -1) {
			drawSprite(ctx, farmerFacingLeftSprite, head.position.x * SPRITE_SIZE, head.position.y * SPRITE_SIZE)
		} else {
			drawSprite(ctx, farmerSprite, head.position.x * SPRITE_SIZE, head.position.y * SPRITE_SIZE)
		}
	} else {
		egg = undefined

		farmerSound.play()
		
		const head = player.cells[0]
		drawSprite(ctx, farmerSpriteRed, head.position.x * SPRITE_SIZE, head.position.y * SPRITE_SIZE)

		const pad = 10
		const menuRect = {x: pad, y: pad, width: VIRTUAL_SCREEN_WIDTH - (pad * 2), height: 100 }
		menuCanvasCtx.save()
		menuCanvasCtx.fillStyle = 'rgba(255, 255, 255, 100)'
		menuCanvasCtx.fillRect(menuRect.x, menuRect.y, menuRect.width, menuRect.height)
		menuCanvasCtx.restore()
		drawCenteredText(menuCanvasCtx, 'You scored: ' + player.cells.length, { ...menuRect, height: menuRect.height - 25 })
		drawCenteredText(menuCanvasCtx, 'Press "r" to play again', { ...menuRect, height: menuRect.height + 25 })
	}

	for(const key in keys) keys[key] = false
}
