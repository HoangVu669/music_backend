# JQBX Gap Analysis Report

**Date:** 2024-12-19  
**Target:** 100% JQBX Compatibility (except Spotify → ZingMP3)

## Executive Summary

Codebase hiện tại đã implement ~80% JQBX features, nhưng còn thiếu một số phần quan trọng:
1. **COOP Mode** - Chưa có implementation
2. **Permission System** - Chưa có hệ thống roles rõ ràng
3. **Drift Rules** - Chưa có rules chi tiết cho drift correction
4. **sync:full** - Chưa có event khi reconnect
5. **Vote Skip Threshold** - Coop mode cần 2/3, hiện tại chỉ có 50%
6. **hostQueue** - Chưa có queue riêng cho host
7. **Server Tick** - Cần đảm bảo broadcast mỗi 250ms

---

## 1. ROOM MODES

### ✅ IMPLEMENTED
- **Host Mode (normal)**: ✅ Đã có
  - Host toàn quyền play/pause/seek/skip
  - Queue của host (shared queue)
  - Host disconnect → hostFallback ✅

- **Rotation Mode (dj_rotation)**: ✅ Đã có
  - Danh sách DJ có order ✅
  - Mỗi DJ có personalQueue ✅
  - Autoplay khi hết bài ✅
  - Idle detection ✅
  - rotation:prepare_next_track event trước 3s ✅
  - DJ disconnect → next DJ ✅

### ❌ MISSING
- **COOP Mode**: ❌ Chưa có
  - Shared queue cho tất cả members
  - Tất cả member được add/skip bằng vote (2/3 active)
  - Không có host, tất cả đều bình đẳng

**Impact:** HIGH - Coop mode là một trong 3 modes chính của JQBX

---

## 2. PERMISSION SYSTEM

### ✅ IMPLEMENTED
- Basic permission checks trong các methods
- `allowMemberSkip`, `allowMemberAddTrack` trong settings

### ❌ MISSING
- **Explicit Role System**: ❌ Chưa có
  - Roles: `owner`, `host`, `dj`, `member`, `guest`
  - Permission matrix rõ ràng
  - Role-based access control

**Current State:**
```javascript
// Hiện tại chỉ check:
- String(room.hostId) === String(userId) // Host check
- String(room.ownerId) === String(userId) // Owner check
- room.members.some(m => String(m.userId) === String(userId)) // Member check
```

**Required:**
```javascript
// Cần có:
function hasPermission(room, userId, action) {
  const role = getUserRole(room, userId);
  return permissionMatrix[role][action];
}
```

**Impact:** MEDIUM - Cần cho việc implement COOP mode và permission checks chính xác

---

## 3. QUEUE MANAGEMENT

### ✅ IMPLEMENTED
- Shared queue (normal mode) ✅
- DJ queue (rotation mode) ✅
- Autoplay limit = 5 ✅
- Vote skip = 50% ✅
- DJ autoplay chain reset when manual queue ✅

### ❌ MISSING
- **hostQueue riêng**: ❌ Chưa có
  - Host mode nên có queue riêng của host
  - Hiện tại dùng shared queue

- **Coop mode vote skip = 2/3**: ❌ Chưa có
  - Coop mode cần threshold 2/3 (66.67%)
  - Hiện tại chỉ có 50%

**Impact:** MEDIUM - Cần cho COOP mode và Host mode chính xác

---

## 4. NETWORK SYNC RECOVERY

### ✅ IMPLEMENTED
- sync:ping/sync:pong ✅
- player:sync heartbeat mỗi 3s ✅
- Drift correction structure ✅
- Jitter detection ✅
- serverTime trong sync data ✅

### ❌ MISSING
- **Drift Rules chi tiết**: ❌ Chưa có
  - <200ms: ignore
  - 200-800ms: soft correct (gradual adjustment)
  - >800ms: hard seek (immediate seek)

**Current State:**
```javascript
// Hiện tại chỉ có:
if (drift > 0.3) { // 300ms threshold
  clientSeek(expectedPosition);
}
```

**Required:**
```javascript
// Cần có:
if (drift < 0.2) {
  // Ignore
} else if (drift < 0.8) {
  // Soft correct (gradual)
  gradualAdjust(expectedPosition);
} else {
  // Hard seek
  clientSeek(expectedPosition);
}
```

- **sync:full event**: ❌ Chưa có
  - Khi client reconnect, cần emit sync:full với full state
  - Hiện tại chỉ emit player:sync

**Impact:** HIGH - Cần cho sync drift < 200ms trên 99.5% trường hợp

---

## 5. SERVER TICK INTERVAL

### ✅ IMPLEMENTED
- PlaybackEngine tick: 500ms ✅
- DjRotationEngine tick: 250ms ✅
- Sync heartbeat: 3000ms ✅

### ❌ MISSING
- **Server broadcast sync mỗi 250ms**: ❌ Chưa rõ
  - Spec yêu cầu server tick 250ms
  - Hiện tại sync heartbeat là 3000ms (đúng cho host sync)
  - Nhưng cần đảm bảo server broadcast position mỗi 250ms

**Impact:** MEDIUM - Cần cho sync chính xác hơn

---

## 6. SOCKET PROTOCOL

### ✅ IMPLEMENTED
- Tất cả events cơ bản ✅
- socket-protocol.md đã có ✅

### ❌ MISSING
- **sync:full event**: ❌ Chưa có trong doc
- **coop mode events**: ❌ Chưa có
- **Drift rules documentation**: ❌ Chưa có

**Impact:** LOW - Documentation cần update

---

## 7. TESTS

### ✅ IMPLEMENTED
- Unit tests cho syncUtils ✅
- Unit tests cho voteSkip ✅
- Unit tests cho djRotation ✅
- Integration tests ✅

### ❌ MISSING
- Tests cho COOP mode ❌
- Tests cho permission system ❌
- Tests cho drift rules ❌
- Tests cho sync:full ❌

**Impact:** MEDIUM - Cần tests để validate

---

## PRIORITY MATRIX

| Feature | Priority | Impact | Effort | Status |
|---------|----------|--------|--------|--------|
| COOP Mode | HIGH | HIGH | HIGH | ❌ Missing |
| Permission System | HIGH | MEDIUM | MEDIUM | ❌ Missing |
| Drift Rules | HIGH | HIGH | LOW | ❌ Missing |
| sync:full | MEDIUM | HIGH | LOW | ❌ Missing |
| Vote Skip 2/3 | MEDIUM | MEDIUM | LOW | ❌ Missing |
| hostQueue | LOW | MEDIUM | MEDIUM | ❌ Missing |
| Server Tick 250ms | MEDIUM | MEDIUM | LOW | ⚠️ Review |
| Tests | MEDIUM | MEDIUM | MEDIUM | ❌ Missing |

---

## RECOMMENDED PATCH ORDER

1. **Drift Rules** (HIGH priority, LOW effort)
2. **sync:full event** (HIGH priority, LOW effort)
3. **Permission System** (HIGH priority, MEDIUM effort)
4. **COOP Mode** (HIGH priority, HIGH effort)
5. **Vote Skip 2/3** (MEDIUM priority, LOW effort)
6. **hostQueue** (LOW priority, MEDIUM effort)
7. **Tests** (MEDIUM priority, MEDIUM effort)
8. **Documentation** (LOW priority, LOW effort)

---

## NEXT STEPS

1. Patch drift rules trong syncUtils và client-side logic
2. Thêm sync:full event khi reconnect
3. Implement permission system
4. Implement COOP mode
5. Update vote skip threshold cho coop mode
6. Add tests
7. Update documentation

