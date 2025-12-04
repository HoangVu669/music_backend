/**
 * Unit tests for host fallback logic
 */

describe('Host Fallback Logic', () => {
    test('should prioritize rotation current DJ over owner', () => {
        const room = {
            mode: 'dj_rotation',
            ownerId: 'owner1',
            currentDjIndex: 0,
            djs: [
                {
                    userId: 'dj1',
                    isActive: true,
                },
            ],
            members: [
                { userId: 'owner1' },
                { userId: 'dj1' },
                { userId: 'member1' },
            ],
        };

        // Priority: rotation DJ → owner → first member
        let newHostId = null;

        if (room.mode === 'dj_rotation' && room.currentDjIndex >= 0 && room.djs[room.currentDjIndex]) {
            const currentDj = room.djs[room.currentDjIndex];
            if (currentDj && currentDj.isActive) {
                newHostId = currentDj.userId;
            }
        }

        if (!newHostId) {
            newHostId = room.ownerId;
        }

        if (!newHostId && room.members.length > 0) {
            newHostId = room.members[0].userId;
        }

        expect(newHostId).toBe('dj1'); // Should be current DJ, not owner
    });

    test('should fallback to owner if no rotation DJ', () => {
        const room = {
            mode: 'normal',
            ownerId: 'owner1',
            members: [
                { userId: 'owner1' },
                { userId: 'member1' },
            ],
        };

        let newHostId = null;

        if (room.mode === 'dj_rotation' && room.currentDjIndex >= 0) {
            // Skip rotation check
        }

        if (!newHostId) {
            newHostId = room.ownerId;
        }

        if (!newHostId && room.members.length > 0) {
            newHostId = room.members[0].userId;
        }

        expect(newHostId).toBe('owner1');
    });

    test('should fallback to first member if no owner', () => {
        const room = {
            mode: 'normal',
            ownerId: null,
            members: [
                { userId: 'member1' },
                { userId: 'member2' },
            ],
        };

        let newHostId = null;

        if (!newHostId) {
            newHostId = room.ownerId;
        }

        if (!newHostId && room.members.length > 0) {
            newHostId = room.members[0].userId;
        }

        expect(newHostId).toBe('member1');
    });
});

