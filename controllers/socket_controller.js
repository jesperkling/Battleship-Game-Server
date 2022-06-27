/**
 * Socket Controller
 */

const debug = require('debug')('battleships:socket_controller');
let io = null; // socket.io server instance

const games = [
	{
		id: "room1",
		name: "Open room 1",
		neverDelete: true,
		players: {},
	},
	{
		id: "room2",
		name: "Open room 2",
		neverDelete: true,
		players: {},
	},
	{
		id: "room3",
		name: "Open room 3",
		neverDelete: true,
		players: {},
	},
]

/**
 * Get room by id
 *
 */
const getGameById = (id) => {
	return games.find((game) => game.id === id)
}

/**
 * Get room by user id
 *
 */
const getGameByUserId = (id) => {
	return games.find((gameRoom) => gameRoom.players.hasOwnProperty(id))
}

/**
 * Handle a requesting list of rooms
 *
 */
const handleGetGameList = function (callback) {
	const game_list = games.map((game) => {
		if (Object.keys(game.players).length < 2) {
			return {
				id: game.id,
				name: game.name,
				players: game.players,
			} 
		} else {
			return false
		}
	})
	callback(game_list)
}

/**
 * Checking games
 *
 */
const handleCheckGames = function (game, callback) {
	let newGame = getGameById(game)

	if (!newGame) {
		callback({
			success: true,
		})
		return
	}

	callback({
		success: false,
	})
}

/**
 * Handle a user disconnecting
 *
 */
const handleDisconnect = function() {
	debug(`Client ${this.id} disconnected :(`)

	const game = getGameByUserId(this.id)

	if (!game) {
		return
	}

	this.broadcast.to(game.id).emit('player:disconnected', game.players[this.id])

	delete game.players[this.id]

	if (Object.keys(game.players).length === 0 && game.neverDelete === false) {
		delete game.id
		delete game.name
	}

	this.broadcast.to(game.id).emi('player:list', game.players)
	io.emit('new-game-list')
}

/**
 * Handle a user connecting
 *
 */
const handlePlayerJoined = async function (username, game_id, callback) {
	debug(`user: ${username} with socket id: ${this.id} wants to join room: ${game_id}`)

	this.join(game_id)

	let game = getGameById(game_id)

	if (!game) {
		let newGame = {
			id: game_id,
			name: game_id,
			neverDelete: false,
			players: {},
		}
		games.push(newGame)
		game = getGameById(game_id)

		console.log('new game:', game)
	}

	game.players[this.id] = username

	this.broadcast.to(game.id).emit('player:joined', username)

	callback({
		success: true,
		gameName: game.name,
		players: game.players,
	})

	io.to(game.id).emit('player:list', game.players)
}

/**
 * Handle player leaving game
 *
 */
const handlePlayerLeft = async function (username, game_id) {
	debug(`User ${username} with socket id ${this.id} left room '${game_id}'`)

	this.leave(game_id)

	const game = getGameById(game_id)

	delete game.players[this.id]

	if (Object.keys(game.players).length === 0 && game.neverDelete === false) {
		delete game.id
		delete game.name
		console.log('game after delete:', game)
	}

	this.broadcast.to(game.id).emit('player:left', username)

	io.to(game.id).emit('user:list', game.players)
	io.emit('new-game-list')
}

/**
 * Handle ship events
 *
 */
const handleShipData = async function(game_id, shipdata1, shipdata2, shipdata3, shipdata4) {
	this.broadcast.to('game_id').emit('get-ship-data', shipdata1, shipdata2, shipdata3, shipdata4)
}


/**
 * Export controller and attach handlers to events
 *
 */
module.exports = function(socket, _io) {
	// save a reference to the socket.io server instance
	io = _io;

	debug(`Client ${socket.id} connected`)

	// handle user disconnect
	socket.on('disconnect', handleDisconnect);

	// listen for 'clock:start' event
	socket.on('get-game-list', handleGetGameList)

	socket.on('update-list', () => {
		io.emit('new-game-list')
	})

	socket.on('ship-data', handleShipData)

	socket.on('check-games', handleCheckGames)

	socket.on('player:left', handlePlayerLeft)

	socket.on('player:joined', handlePlayerJoined)

}
