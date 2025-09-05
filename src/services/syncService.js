const zingMp3Service = require('./zingMp3Service');
const Song = require('../models/Song');
const Artist = require('../models/Artist');
const Album = require('../models/Album');

class SyncService {
    // Đồng bộ bài hát từ Zing MP3
    async syncSong(zingSongId) {
        try {
            // Lấy thông tin bài hát từ Zing MP3
            const songResult = await zingMp3Service.getSong(zingSongId);
            if (!songResult.success) {
                throw new Error(`Không thể lấy thông tin bài hát: ${songResult.error}`);
            }

            const zingData = songResult.data;
            
            // Kiểm tra xem bài hát đã tồn tại chưa
            let existingSong = await Song.findOne({ 
                'zingId': zingSongId 
            });

            if (existingSong) {
                // Cập nhật thông tin bài hát
                existingSong.title = zingData.title || existingSong.title;
                existingSong.duration = zingData.duration || existingSong.duration;
                existingSong.genre = zingData.genre || existingSong.genre;
                existingSong.coverImage = zingData.thumbnail || existingSong.coverImage;
                existingSong.audioFile = zingData.link || existingSong.audioFile;
                existingSong.lyrics = zingData.lyric || existingSong.lyrics;
                existingSong.releaseDate = zingData.releaseDate || existingSong.releaseDate;
                
                await existingSong.save();
                return { success: true, data: existingSong, message: 'Cập nhật bài hát thành công' };
            }

            // Tạo nghệ sĩ mới nếu chưa có
            let artist = null;
            if (zingData.artists && zingData.artists.length > 0) {
                const artistName = zingData.artists[0].name;
                artist = await Artist.findOne({ name: artistName });
                
                if (!artist) {
                    artist = new Artist({
                        name: artistName,
                        bio: `Nghệ sĩ từ Zing MP3: ${artistName}`,
                        avatar: zingData.artists[0].thumbnail || '',
                        country: 'Vietnam',
                        genres: [zingData.genre || 'Pop'],
                        isActive: true
                    });
                    await artist.save();
                }
            }

            // Tạo album mới nếu chưa có
            let album = null;
            if (zingData.album) {
                album = await Album.findOne({ title: zingData.album.title });
                
                if (!album) {
                    album = new Album({
                        title: zingData.album.title,
                        artist: artist ? artist._id : null,
                        description: `Album từ Zing MP3: ${zingData.album.title}`,
                        coverImage: zingData.album.thumbnail || '',
                        releaseDate: zingData.album.releaseDate || new Date(),
                        genre: zingData.genre || 'Pop',
                        isActive: true
                    });
                    await album.save();
                }
            }

            // Tạo bài hát mới
            const newSong = new Song({
                title: zingData.title,
                artist: artist ? artist._id : null,
                album: album ? album._id : null,
                duration: zingData.duration || 0,
                genre: zingData.genre || 'Pop',
                lyrics: zingData.lyric || '',
                audioFile: zingData.link || '',
                coverImage: zingData.thumbnail || '',
                trackNumber: zingData.trackNumber || 1,
                isActive: true,
                playCount: 0,
                likes: [],
                releaseDate: zingData.releaseDate || new Date(),
                language: 'Vietnamese',
                explicit: false,
                zingId: zingSongId // Lưu ID gốc từ Zing MP3
            });

            await newSong.save();
            return { success: true, data: newSong, message: 'Đồng bộ bài hát thành công' };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Đồng bộ playlist từ Zing MP3
    async syncPlaylist(zingPlaylistId) {
        try {
            // Lấy thông tin playlist từ Zing MP3
            const playlistResult = await zingMp3Service.getDetailPlaylist(zingPlaylistId);
            if (!playlistResult.success) {
                throw new Error(`Không thể lấy thông tin playlist: ${playlistResult.error}`);
            }

            const zingData = playlistResult.data;
            
            // Đồng bộ tất cả bài hát trong playlist
            const syncPromises = zingData.songs.map(song => this.syncSong(song.encodeId));
            const syncResults = await Promise.all(syncPromises);
            
            const successfulSongs = syncResults
                .filter(result => result.success)
                .map(result => result.data._id);

            return {
                success: true,
                data: {
                    playlistInfo: zingData,
                    syncedSongs: successfulSongs,
                    totalSongs: zingData.songs.length,
                    syncedCount: successfulSongs.length
                },
                message: `Đồng bộ playlist thành công: ${successfulSongs.length}/${zingData.songs.length} bài hát`
            };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Đồng bộ nghệ sĩ từ Zing MP3
    async syncArtist(artistName) {
        try {
            // Lấy thông tin nghệ sĩ từ Zing MP3
            const artistResult = await zingMp3Service.getArtist(artistName);
            if (!artistResult.success) {
                throw new Error(`Không thể lấy thông tin nghệ sĩ: ${artistResult.error}`);
            }

            const zingData = artistResult.data;
            
            // Kiểm tra xem nghệ sĩ đã tồn tại chưa
            let existingArtist = await Artist.findOne({ name: artistName });
            
            if (existingArtist) {
                // Cập nhật thông tin nghệ sĩ
                existingArtist.bio = zingData.biography || existingArtist.bio;
                existingArtist.avatar = zingData.thumbnail || existingArtist.avatar;
                existingArtist.genres = zingData.genres || existingArtist.genres;
                
                await existingArtist.save();
                return { success: true, data: existingArtist, message: 'Cập nhật nghệ sĩ thành công' };
            }

            // Tạo nghệ sĩ mới
            const newArtist = new Artist({
                name: artistName,
                bio: zingData.biography || `Nghệ sĩ từ Zing MP3: ${artistName}`,
                avatar: zingData.thumbnail || '',
                country: 'Vietnam',
                genres: zingData.genres || ['Pop'],
                isActive: true
            });

            await newArtist.save();
            return { success: true, data: newArtist, message: 'Đồng bộ nghệ sĩ thành công' };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Đồng bộ top 100
    async syncTop100() {
        try {
            const top100Result = await zingMp3Service.getTop100();
            if (!top100Result.success) {
                throw new Error(`Không thể lấy top 100: ${top100Result.error}`);
            }

            const zingData = top100Result.data;
            const syncPromises = zingData.map(song => this.syncSong(song.encodeId));
            const syncResults = await Promise.all(syncPromises);
            
            const successfulSongs = syncResults
                .filter(result => result.success)
                .map(result => result.data._id);

            return {
                success: true,
                data: {
                    syncedSongs: successfulSongs,
                    totalSongs: zingData.length,
                    syncedCount: successfulSongs.length
                },
                message: `Đồng bộ top 100 thành công: ${successfulSongs.length}/${zingData.length} bài hát`
            };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Tìm kiếm và đồng bộ
    async searchAndSync(keyword, limit = 10) {
        try {
            const searchResult = await zingMp3Service.search(keyword);
            if (!searchResult.success) {
                throw new Error(`Không thể tìm kiếm: ${searchResult.error}`);
            }

            const zingData = searchResult.data.songs || [];
            const songsToSync = zingData.slice(0, limit);
            
            const syncPromises = songsToSync.map(song => this.syncSong(song.encodeId));
            const syncResults = await Promise.all(syncPromises);
            
            const successfulSongs = syncResults
                .filter(result => result.success)
                .map(result => result.data._id);

            return {
                success: true,
                data: {
                    keyword,
                    syncedSongs: successfulSongs,
                    totalFound: zingData.length,
                    syncedCount: successfulSongs.length
                },
                message: `Tìm kiếm và đồng bộ thành công: ${successfulSongs.length}/${songsToSync.length} bài hát`
            };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

module.exports = new SyncService(); 