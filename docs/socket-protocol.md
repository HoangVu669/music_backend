# Socket Protocol Specification

## Overview
This document describes the Socket.IO protocol for real-time group music listening with JQBX-style synchronization.

## Connection

### Authentication
All socket connections require JWT authentication via:
- `socket.handshake.auth.token` or
- `Authorization: Bearer <token>` header

### Connection Event
```javascript
socket.on('connect', () => {
  console.log('Connected');
});
```

## Room Events

### Client → Server

#### `room:join`
Join a room.

**Payload:**
```json
{
  "roomId": "room123"
}
```

**Response:** `room:joined` event

---

#### `room:leave`
Leave a room.

**Payload:**
```json
{
  "roomId": "room123"
}
```

---

### Server → Client

#### `room:joined`
Emitted when user successfully joins a room.

**Payload:**
```json
{
  "room": {
    "roomId": "room123",
    "name": "My Room",
    "hostId": "user1",
    "currentTrack": { ... },
    "members": [ ... ],
    "mode": "normal" | "dj_rotation"
  }
}
```

---

#### `room:member-joined`
Emitted to all room members when a new member joins.

**Payload:**
```json
{
  "userId": "user2",
  "userName": "User 2",
  "memberCount": 5,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

#### `room:member-left`
Emitted when a member leaves.

**Payload:**
```json
{
  "userId": "user2",
  "userName": "User 2",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

#### `room:host_changed`
Emitted when host changes (e.g., on disconnect).

**Payload:**
```json
{
  "roomId": "room123",
  "newHostId": "user2",
  "newHostName": "User 2",
  "previousHostId": "user1",
  "timestamp": 1234567890
}
```

---

## Sync & Drift Correction

### Client → Server

#### `sync:ping`
Ping server for RTT calculation.

**Payload:**
```json
{
  "clientTimestamp": 1234567890
}
```

**Response:** `sync:pong` event

---

### Server → Client

#### `sync:pong`
Response to `sync:ping` for RTT calculation.

**Payload:**
```json
{
  "clientTimestamp": 1234567890,
  "serverTimestamp": 1234567891
}
```

**RTT Calculation:**
```javascript
const rtt = Date.now() - clientTimestamp;
const serverTime = serverTimestamp + (rtt / 2);
```

---

#### `player:sync`
Heartbeat sync event emitted every 3000ms (host sends to members).

**Payload:**
```json
{
  "roomId": "room123",
  "trackId": "zing123",
  "zingId": "zing123",
  "position": 45,
  "positionDecimal": 45.123,
  "isPlaying": true,
  "timestamp": 1234567890,
  "serverTime": 1234567890,
  "startedAt": 1234567845,
  "duration": 180,
  "title": "Song Title",
  "artist": "Artist Name",
  "thumbnail": "https://...",
  "djUserId": null,
  "queuedBy": "user1",
  "mode": "normal"
}
```

**Client Drift Correction (JQBX Standard):**
```javascript
const rtt = Date.now() - syncData.timestamp;
const serverTime = syncData.serverTime + (rtt / 2);
const expectedPosition = (serverTime - syncData.startedAt) / 1000;
const drift = Math.abs(expectedPosition - clientPosition) * 1000; // Convert to ms

// JQBX drift rules:
if (drift < 200) {
  // Ignore - drift is acceptable
} else if (drift < 800) {
  // Soft correct - gradual adjustment
  gradualAdjust(expectedPosition);
} else {
  // Hard seek - immediate correction
  clientSeek(expectedPosition);
}
```

**Using syncUtils helper:**
```javascript
const { getDriftCorrection } = require('./utils/syncUtils');
const correction = getDriftCorrection(syncData, clientPosition, Date.now());
if (correction) {
  switch (correction.action) {
    case 'ignore':
      // No correction needed
      break;
    case 'soft':
      gradualAdjust(correction.expectedPosition);
      break;
    case 'hard':
      clientSeek(correction.expectedPosition);
      break;
  }
}
```

---

#### `player:host_lagging`
Emitted to host when jitter detected.

**Payload:**
```json
{
  "roomId": "room123",
  "message": "Host sync lagging detected",
  "timestamp": 1234567890
}
```

---

## Playback Control (Host Only)

### Client → Server

#### `player:host_play`
Host starts playback.

**Payload:**
```json
{
  "roomId": "room123"
}
```

---

#### `player:host_pause`
Host pauses playback.

**Payload:**
```json
{
  "roomId": "room123"
}
```

---

#### `player:host_seek`
Host seeks to position.

**Payload:**
```json
{
  "roomId": "room123",
  "position": 60
}
```

---

#### `player:host_skip`
Host skips to next track.

**Payload:**
```json
{
  "roomId": "room123"
}
```

---

#### `player:host_change_track`
Host changes track.

**Payload:**
```json
{
  "roomId": "room123",
  "zingId": "zing123"
}
```

---

### Server → Client

#### `player:host_play`
Broadcasted to all members when host plays.

**Payload:**
```json
{
  "roomId": "room123",
  "currentTrack": { ... },
  "syncData": { ... },
  "timestamp": 1234567890
}
```

---

#### `player:track_started`
Emitted when a new track starts.

**Payload:**
```json
{
  "roomId": "room123",
  "currentTrack": { ... },
  "syncData": { ... },
  "timestamp": 1234567890
}
```

---

#### `player:track_ending_soon`
Emitted 1.2 seconds before track ends (soft end).

**Payload:**
```json
{
  "roomId": "room123",
  "currentTrack": { ... },
  "timestamp": 1234567890
}
```

---

#### `player:track_ended`
Emitted when track ends.

**Payload:**
```json
{
  "roomId": "room123",
  "timestamp": 1234567890
}
```

---

## DJ Rotation Events

### Client → Server

#### `dj:join`
Join DJ rotation.

**Payload:**
```json
{
  "roomId": "room123"
}
```

---

#### `dj:leave`
Leave DJ rotation.

**Payload:**
```json
{
  "roomId": "room123"
}
```

---

#### `dj:add_track`
Add track to DJ queue.

**Payload:**
```json
{
  "roomId": "room123",
  "zingId": "zing123"
}
```

---

#### `dj:remove_track`
Remove track from DJ queue.

**Payload:**
```json
{
  "roomId": "room123",
  "zingId": "zing123"
}
```

---

#### `rotation:request_sync`
Request current sync data.

**Payload:**
```json
{
  "roomId": "room123"
}
```

**Response:** `player:sync` event

---

### Server → Client

#### `rotation:state_update`
Emitted when rotation state changes.

**Payload:**
```json
{
  "roomId": "room123",
  "djs": [ ... ],
  "currentDjIndex": 0,
  "currentTrack": { ... },
  "timestamp": 1234567890
}
```

---

#### `rotation:next_dj`
Emitted when DJ advances.

**Payload:**
```json
{
  "roomId": "room123",
  "currentDjIndex": 1,
  "currentDj": {
    "userId": "dj2",
    "userName": "DJ 2"
  },
  "timestamp": 1234567890
}
```

---

#### `rotation:prepare_next_track`
Emitted 3 seconds before track ends to current DJ.

**Payload:**
```json
{
  "roomId": "room123",
  "currentDj": {
    "userId": "dj1",
    "userName": "DJ 1"
  },
  "currentTrack": { ... },
  "timestamp": 1234567890
}
```

---

#### `rotation:dj_inactive`
Emitted when DJ is auto-kicked for being idle.

**Payload:**
```json
{
  "roomId": "room123",
  "dj": {
    "userId": "dj1",
    "userName": "DJ 1"
  },
  "reason": "IDLE_TIMEOUT",
  "timestamp": 1234567890
}
```

---

#### `rotation:idle`
Emitted when all DJs are empty and no autoplay fallback.

**Payload:**
```json
{
  "roomId": "room123",
  "message": "No active DJs with tracks",
  "timestamp": 1234567890
}
```

---

#### `rotation:dj_list_update`
Emitted when DJ list changes.

**Payload:**
```json
{
  "roomId": "room123",
  "djs": [ ... ],
  "currentDjIndex": 0,
  "timestamp": 1234567890
}
```

---

## Vote Skip Events

### Client → Server

#### `vote:skip`
Vote to skip current track.

**Payload:**
```json
{
  "roomId": "room123"
}
```

---

#### `vote:unskip`
Remove skip vote.

**Payload:**
```json
{
  "roomId": "room123"
}
```

---

#### `vote:get_status`
Get current vote status.

**Payload:**
```json
{
  "roomId": "room123"
}
```

**Response:** `vote:skip_status` event

---

### Server → Client

#### `vote:skip_updated`
Emitted when vote count changes.

**Payload:**
```json
{
  "roomId": "room123",
  "voteCount": 3,
  "threshold": 5,
  "hasEnoughVotes": false,
  "needMoreVotes": 2,
  "timestamp": 1234567890
}
```

---

#### `vote:skip_passed`
Emitted when skip threshold is reached.

**Payload:**
```json
{
  "roomId": "room123",
  "reason": "VOTE_PASSED",
  "timestamp": 1234567890
}
```

---

#### `vote:skip_status`
Response to `vote:get_status`.

**Payload:**
```json
{
  "roomId": "room123",
  "voteCount": 3,
  "threshold": 5,
  "hasEnoughVotes": false,
  "needMoreVotes": 2,
  "voteSkipEnabled": true,
  "votes": [ ... ],
  "activeUserCount": 10,
  "memberCount": 10,
  "timestamp": 1234567890
}
```

---

## Error Events

### Server → Client

#### `error`
Emitted on error.

**Payload:**
```json
{
  "message": "Error message",
  "code": "ERROR_CODE"
}
```

---

## Reconnection Flow

1. Client reconnects and sends `room:join` with same `roomId`
2. Server responds with `room:joined` including current room state
3. Server immediately sends `sync:full` with complete sync state
4. Server sends `player:sync` with current track state
5. If rotation mode, server sends `rotation:state_update`
6. Client corrects position based on `serverTime` and `startedAt` using drift rules

---

#### `sync:full`
Emitted when client reconnects to provide complete sync state.

**Payload:**
```json
{
  "roomId": "room123",
  "currentTrack": { ... },
  "syncData": {
    "trackId": "zing123",
    "position": 45,
    "positionDecimal": 45.123,
    "isPlaying": true,
    "timestamp": 1234567890,
    "serverTime": 1234567890,
    "startedAt": 1234567845,
    "duration": 180
  },
  "queue": [ ... ],
  "mode": "normal" | "coop" | "dj_rotation",
  "timestamp": 1234567890
}
```

---

## Notes

- All timestamps are in milliseconds (Unix epoch)
- Position is in seconds (integer in `position`, decimal in `positionDecimal`)
- `sessionId` for votes = `trackId + startedAt`
- Sync interval: 3000ms (configurable in `config/jqbx.js`)
- Drift threshold: 300ms (configurable)
- Jitter threshold: 2000ms (configurable)

