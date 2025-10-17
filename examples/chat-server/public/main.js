const $ = (el) => document.querySelector(el);

const $roomId = $('#room-id');
const $roomSize = $('#room-size');
const $memberList = $('#member-list');
const $chatList = $('#chat-list');
const $chatForm = $('#chat-form');
const $messageInput = $('#message');
const $roomList = $('#room-list');
const $writingBox = $('#writing-box');

let ws = null;
let wsClassification = null;
let roommates = [];
let writers = [];

function connectToRoom(roomId) {
	if (ws) ws.close();

	roommates = [];
	$roomSize.textContent = '0';
	$memberList.innerHTML = '';
	$chatList.innerHTML = `<li><em>Connecting to room: ${roomId}...</em></li>`;

	ws = new WebSocket(`ws://localhost:3000/room/${roomId}`);

	ws.onopen = () => {
		$chatList.innerHTML += `<li><strong>Connected to room: ${roomId}</strong></li>`;
	};

	ws.onmessage = (event) => {
		const data = JSON.parse(event.data);
		switch (data.type) {
			case 'sync':
				roommates = data.roommates;
				$roomSize.textContent = roommates.length;
				$memberList.innerHTML = roommates
					.map((v, i) => `<li><strong>${i}: </strong>${v}</li>`)
					.join('\n');
				break;

			case 'join':
				roommates.push(data.id);
				$roomSize.textContent = roommates.length;
				$memberList.innerHTML = roommates
					.map((v, i) => `<li><strong>${i}: </strong>${v}</li>`)
					.join('\n');
				$chatList.innerHTML += `<li><strong>${data.id} joined the conversation.</strong></li>`;
				break;

			case 'leave':
				roommates = roommates.filter((v) => v !== data.id);
				$roomSize.textContent = roommates.length;
				$memberList.innerHTML = roommates
					.map((v, i) => `<li><strong>${i}: </strong>${v}</li>`)
					.join('\n');
				$chatList.innerHTML += `<li><strong>${data.id} left the conversation.</strong></li>`;
				break;

			case 'message': {
				const msg = data.data;
				const sender = msg.id || 'unknown';
				$chatList.innerHTML += `<li><strong>${sender}: </strong>${msg.message}</li>`;
				break;
			}

			case 'writing': {
				writers.push(data.id);
				const size = writers.length - 3;

				if (size > 0) {
					$writingBox.innerHTML = `${(writers[0], writers[1], writers[2])}, More than ${size} people are writing.`;
				} else {
					$writingBox.innerHTML = `${writers.join(', ')} are writing.`;
				}
				break;
			}

			case 'reading': {
				writers = writers.filter((v) => v !== data.id);
				if (writers.length < 1) {
          $writingBox.innerHTML = '';
				} else {
					const size = writers.length - 3;

					if (size > 0) {
						$writingBox.innerHTML = `${(writers[0], writers[1], writers[2])}, More than ${size} people are writing.`;
					} else {
						$writingBox.innerHTML = `${writers.join(', ')} are writing.`;
					}
				}
				break;
			}
		}
	};
}

$messageInput.addEventListener('focus', (e) => {
	ws.send(JSON.stringify({ event: 'writing' }));
});

$messageInput.addEventListener('blur', (e) => {
	ws.send(JSON.stringify({ event: 'reading' }));
});

$chatForm.addEventListener('submit', (e) => {
	e.preventDefault();
	e.stopPropagation();

	const message = $messageInput.value.trim();
	if (!message || !ws || ws.readyState !== WebSocket.OPEN) return;

	ws.send(message);
	$chatList.innerHTML += `<li><strong>you: </strong>${message}</li>`;
	$messageInput.value = '';
});

$roomId.addEventListener('change', () => {
	const newRoom = $roomId.value.trim() || 'general';
	connectToRoom(newRoom);
});

// 🔥 Classification socket — actualiza la lista de rooms activas
function connectClassification() {
	wsClassification = new WebSocket('ws://localhost:3000/room/classification');

	wsClassification.onmessage = (event) => {
		const rooms = JSON.parse(event.data);

		$roomList.innerHTML = Object.entries(rooms)
			.map(([name, size]) => {
				const cleanName = name.replace(/^rooms-/, '');
				return `<li data-room="${cleanName}">
							<strong>${cleanName}</strong> (${size})
						</li>`;
			})
			.join('');

		document.querySelectorAll('#room-list li').forEach((li) => {
			li.addEventListener('click', () => {
				const selected = li.dataset.room;
				$roomId.value = selected;
				connectToRoom(selected);
			});
		});
	};

	wsClassification.onclose = () => {
		setTimeout(connectClassification, 2000);
	};
}

$roomId.value = 'general';
connectToRoom($roomId.value);
connectClassification();
