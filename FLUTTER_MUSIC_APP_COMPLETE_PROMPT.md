# 🎵 Flutter Music App - Complete Generation Prompt

## 📋 **PROMPT CHO AI:**

```
Tôi cần bạn tạo một Flutter Music Streaming App hoàn chỉnh với clean architecture, sử dụng Cubit/Bloc cho state management, giao diện sáng tối đẹp và code clean nhất có thể.

## 🎯 **BACKEND API INFO:**
- Base URL: http://localhost:4000
- User endpoints: /api/v1/user/
- Admin endpoints: /api/v1/admin/
- Authentication: JWT Bearer token
- Response format: {success: boolean, data: object, message: string, error: string}

## 🏗️ **ULTRA SIMPLIFIED ARCHITECTURE:**

```
lib/
├── main.dart
├── app.dart
├── routes.dart
├── theme.dart
├── constants.dart
├── models/
│   ├── user_model.dart
│   ├── song_model.dart
│   ├── artist_model.dart
│   ├── playlist_model.dart
│   └── comment_model.dart
├── repositories/
│   ├── auth_repository.dart
│   ├── music_repository.dart
│   ├── search_repository.dart
│   ├── playlist_repository.dart
│   └── social_repository.dart
├── services/
│   ├── api_service.dart
│   ├── storage_service.dart
│   └── audio_service.dart
├── cubit/
│   ├── auth_cubit.dart
│   ├── home_cubit.dart
│   ├── music_player_cubit.dart
│   ├── search_cubit.dart
│   ├── playlist_cubit.dart
│   └── social_cubit.dart
├── pages/
│   ├── login_page.dart
│   ├── register_page.dart
│   ├── profile_page.dart
│   ├── home_page.dart
│   ├── search_page.dart
│   ├── music_player_page.dart
│   ├── playlist_list_page.dart
│   ├── playlist_details_page.dart
│   └── comments_page.dart
├── widgets/
│   ├── loading_widget.dart
│   ├── error_widget.dart
│   ├── custom_app_bar.dart
│   ├── bottom_navigation.dart
│   ├── song_card.dart
│   ├── artist_card.dart
│   ├── playlist_card.dart
│   ├── mini_player.dart
│   ├── music_player_controls.dart
│   ├── login_form.dart
│   ├── register_form.dart
│   ├── comment_item.dart
│   └── add_comment_widget.dart
└── injection_container.dart
```

## 🎨 **THEME & UI REQUIREMENTS:**

### **Design System:**
- Material Design 3
- Dark/Light theme support
- Music-themed color palette
- Smooth animations và transitions
- Responsive design

### **Color Palette:**
```dart
// Light Theme
primary: Color(0xFF6366F1), // Indigo
secondary: Color(0xFFEC4899), // Pink
surface: Color(0xFFFFFFFF),
background: Color(0xFFF8FAFC),
onPrimary: Color(0xFFFFFFFF),
onSecondary: Color(0xFFFFFFFF),
onSurface: Color(0xFF1E293B),
onBackground: Color(0xFF1E293B),

// Dark Theme
primary: Color(0xFF818CF8), // Light Indigo
secondary: Color(0xFFF472B6), // Light Pink
surface: Color(0xFF1E293B),
background: Color(0xFF0F172A),
onPrimary: Color(0xFF0F172A),
onSecondary: Color(0xFF0F172A),
onSurface: Color(0xFFF1F5F9),
onBackground: Color(0xFFF1F5F9),
```

## 🔧 **API ENDPOINTS INTEGRATION:**

### **Authentication APIs:**
```
POST /api/v1/user/auth/register
POST /api/v1/user/auth/login
PUT /api/v1/user/auth/profile
```

### **Music & Discovery APIs:**
```
GET /api/v1/user/home
GET /api/v1/user/charts/top100
GET /api/v1/user/charts/new-release
GET /api/v1/user/search?q={query}&type={song|artist|playlist}
```

### **Song APIs:**
```
GET /api/v1/user/songs/{songId}
GET /api/v1/user/songs/{songId}/stream
POST /api/v1/user/songs/{songId}/like
GET /api/v1/user/songs/liked
```

### **Playlist APIs:**
```
POST /api/v1/user/playlists
GET /api/v1/user/playlists
GET /api/v1/user/playlists/{playlistId}
PUT /api/v1/user/playlists/{playlistId}
DELETE /api/v1/user/playlists/{playlistId}
POST /api/v1/user/playlists/{playlistId}/songs
```

### **Artist APIs:**
```
GET /api/v1/user/artists/{artistId}
GET /api/v1/user/artists/{artistId}/songs
POST /api/v1/user/artists/{artistId}/follow
GET /api/v1/user/artists/followed
GET /api/v1/user/artists/popular
```

### **Social APIs:**
```
POST /api/v1/user/songs/{songId}/comments
GET /api/v1/user/songs/{songId}/comments
PUT /api/v1/user/comments/{commentId}
DELETE /api/v1/user/comments/{commentId}
POST /api/v1/user/comments/{commentId}/like
```

## 🎯 **CUBIT vs BLOC DECISION:**

### **Use CUBIT for:**
- **Auth Feature**: Simple state management (login, register, logout)
- **Music Player**: Audio playback state (play, pause, current song)
- **Search**: Simple search state management
- **Playlist**: Basic CRUD operations

### **Use BLOC for:**
- **Home Feature**: Complex data loading với multiple API calls
- **Social Feature**: Complex comment system với real-time updates
- **Music Discovery**: Complex filtering và sorting logic

## 📦 **REQUIRED PACKAGES:**

```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # State Management
  flutter_bloc: ^8.1.3
  bloc: ^8.1.2
  
  # Dependency Injection
  get_it: ^7.6.4
  injectable: ^2.3.2
  
  # Network
  dio: ^5.4.0
  connectivity_plus: ^5.0.2
  
  # Local Storage
  shared_preferences: ^2.2.2
  hive: ^2.2.3
  hive_flutter: ^1.1.0
  
  # Audio
  just_audio: ^0.9.36
  audio_service: ^0.18.12
  
  # UI
  cached_network_image: ^3.3.0
  shimmer: ^3.0.0
  pull_to_refresh: ^2.0.0
  infinite_scroll_pagination: ^3.2.0
  flutter_animate: ^4.3.0
  
  # Utils
  equatable: ^2.0.5
  dartz: ^0.10.1
  intl: ^0.19.0
  url_launcher: ^6.2.2
  share_plus: ^7.2.2

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0
  build_runner: ^2.4.7
  injectable_generator: ^2.4.1
  hive_generator: ^2.0.1
```

## 🏗️ **CORE IMPLEMENTATION:**

### **1. Dependency Injection Setup:**
```dart
// injection_container.dart
import 'package:get_it/get_it.dart';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

final sl = GetIt.instance;

Future<void> configureDependencies() async {
  // External
  sl.registerLazySingleton(() => Dio());
  sl.registerLazySingleton(() => SharedPreferences.getInstance());
  
  // Services
  sl.registerLazySingleton<ApiService>(() => ApiService(sl(), sl()));
  sl.registerLazySingleton<StorageService>(() => StorageService(sl()));
  sl.registerLazySingleton<AudioService>(() => AudioService());
  
  // Repositories
  sl.registerLazySingleton<AuthRepository>(() => AuthRepository(sl(), sl()));
  sl.registerLazySingleton<MusicRepository>(() => MusicRepository(sl()));
  sl.registerLazySingleton<SearchRepository>(() => SearchRepository(sl()));
  sl.registerLazySingleton<PlaylistRepository>(() => PlaylistRepository(sl()));
  sl.registerLazySingleton<SocialRepository>(() => SocialRepository(sl()));
  
  // Cubits
  sl.registerFactory(() => AuthCubit(sl()));
  sl.registerFactory(() => HomeCubit(sl()));
  sl.registerFactory(() => MusicPlayerCubit(sl(), sl()));
  sl.registerFactory(() => SearchCubit(sl()));
  sl.registerFactory(() => PlaylistCubit(sl()));
  sl.registerFactory(() => SocialCubit(sl()));
}
```

### **2. API Service Implementation:**
```dart
// services/api_service.dart
class ApiService {
  final Dio _dio;
  final StorageService _storageService;
  
  ApiService(this._dio, this._storageService) {
    _dio.options.baseUrl = ApiConstants.baseUrl;
    _dio.options.connectTimeout = const Duration(seconds: 30);
    _dio.options.receiveTimeout = const Duration(seconds: 30);
    
    _dio.interceptors.addAll([
      AuthInterceptor(_storageService),
      LogInterceptor(),
    ]);
  }
  
  Future<Map<String, dynamic>> get(String path, {Map<String, dynamic>? queryParameters}) async {
    try {
      final response = await _dio.get(path, queryParameters: queryParameters);
      return response.data;
    } on DioException catch (e) {
      throw ServerException(e.message ?? 'Server error');
    }
  }
  
  Future<Map<String, dynamic>> post(String path, {Map<String, dynamic>? data}) async {
    try {
      final response = await _dio.post(path, data: data);
      return response.data;
    } on DioException catch (e) {
      throw ServerException(e.message ?? 'Server error');
    }
  }
  
  Future<Map<String, dynamic>> put(String path, {Map<String, dynamic>? data}) async {
    try {
      final response = await _dio.put(path, data: data);
      return response.data;
    } on DioException catch (e) {
      throw ServerException(e.message ?? 'Server error');
    }
  }
  
  Future<Map<String, dynamic>> delete(String path) async {
    try {
      final response = await _dio.delete(path);
      return response.data;
    } on DioException catch (e) {
      throw ServerException(e.message ?? 'Server error');
    }
  }
}
```

### **3. Auth Cubit Implementation:**
```dart
// cubit/auth_cubit.dart
class AuthCubit extends Cubit<AuthState> {
  final AuthRepository _authRepository;
  
  AuthCubit(this._authRepository) : super(AuthInitial());
  
  Future<void> login(String username, String password) async {
    emit(AuthLoading());
    
    try {
      final user = await _authRepository.login(username, password);
      emit(AuthSuccess(user));
    } catch (e) {
      emit(AuthError(e.toString()));
    }
  }
  
  Future<void> register(String username, String email, String password) async {
    emit(AuthLoading());
    
    try {
      final user = await _authRepository.register(username, email, password);
      emit(AuthSuccess(user));
    } catch (e) {
      emit(AuthError(e.toString()));
    }
  }
  
  Future<void> logout() async {
    emit(AuthLoading());
    
    try {
      await _authRepository.logout();
      emit(AuthInitial());
    } catch (e) {
      emit(AuthError(e.toString()));
    }
  }
  
  Future<void> updateProfile(Map<String, dynamic> profileData) async {
    emit(AuthLoading());
    
    try {
      final user = await _authRepository.updateProfile(profileData);
      emit(AuthSuccess(user));
    } catch (e) {
      emit(AuthError(e.toString()));
    }
  }
}
```

### **4. Music Player Cubit:**
```dart
// cubit/music_player_cubit.dart
class MusicPlayerCubit extends Cubit<MusicPlayerState> {
  final MusicRepository _musicRepository;
  final AudioService _audioService;
  
  MusicPlayerCubit(this._musicRepository, this._audioService) 
      : super(MusicPlayerInitial());
  
  Future<void> playSong(Song song) async {
    emit(MusicPlayerLoading());
    
    try {
      final streamingUrl = await _musicRepository.getStreamingUrl(song.id);
      await _audioService.playSong(streamingUrl);
      emit(MusicPlayerPlaying(song, streamingUrl));
    } catch (e) {
      emit(MusicPlayerError(e.toString()));
    }
  }
  
  Future<void> pause() async {
    await _audioService.pause();
    emit(MusicPlayerPaused());
  }
  
  Future<void> resume() async {
    await _audioService.resume();
    emit(MusicPlayerPlaying(state.currentSong!, state.streamingUrl!));
  }
  
  Future<void> seek(Duration position) async {
    await _audioService.seek(position);
    emit(MusicPlayerSeeking(position));
  }
  
  Future<void> nextSong() async {
    // Implement queue logic
    emit(MusicPlayerLoading());
  }
  
  Future<void> previousSong() async {
    // Implement queue logic
    emit(MusicPlayerLoading());
  }
}
```

### **5. Home Cubit Implementation:**
```dart
// cubit/home_cubit.dart
class HomeCubit extends Cubit<HomeState> {
  final MusicRepository _musicRepository;
  
  HomeCubit(this._musicRepository) : super(HomeInitial());
  
  Future<void> loadHomeData() async {
    emit(HomeLoading());
    
    try {
      final homeData = await _musicRepository.getHomeData();
      emit(HomeLoaded(homeData));
    } catch (e) {
      emit(HomeError(e.toString()));
    }
  }
  
  Future<void> refreshHomeData() async {
    try {
      final homeData = await _musicRepository.getHomeData();
      emit(HomeLoaded(homeData));
    } catch (e) {
      emit(HomeError(e.toString()));
    }
  }
  
  Future<void> loadTop100Songs() async {
    try {
      final songs = await _musicRepository.getTop100Songs();
      emit(HomeTop100Loaded(songs));
    } catch (e) {
      emit(HomeError(e.toString()));
    }
  }
  
  Future<void> loadNewReleases() async {
    try {
      final songs = await _musicRepository.getNewReleases();
      emit(HomeNewReleasesLoaded(songs));
    } catch (e) {
      emit(HomeError(e.toString()));
    }
  }
}
```

## 🎨 **UI IMPLEMENTATION:**

### **Main App Structure:**
```dart
// app.dart
class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(create: (_) => sl<AuthCubit>()),
        BlocProvider(create: (_) => sl<HomeCubit>()),
        BlocProvider(create: (_) => sl<MusicPlayerCubit>()),
        BlocProvider(create: (_) => sl<SearchCubit>()),
        BlocProvider(create: (_) => sl<PlaylistCubit>()),
        BlocProvider(create: (_) => sl<SocialCubit>()),
      ],
      child: MaterialApp(
        title: 'Music App',
        theme: AppTheme.lightTheme,
        darkTheme: AppTheme.darkTheme,
        themeMode: ThemeMode.system,
        onGenerateRoute: AppRoutes.generateRoute,
        home: const SplashPage(),
      ),
    );
  }
}
```

### **Home Page Implementation:**
```dart
// pages/home_page.dart
class HomePage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: CustomAppBar(
        title: 'Music App',
        actions: [
          IconButton(
            icon: Icon(Icons.search),
            onPressed: () => Navigator.pushNamed(context, '/search'),
          ),
          IconButton(
            icon: Icon(Icons.person),
            onPressed: () => Navigator.pushNamed(context, '/profile'),
          ),
        ],
      ),
      body: BlocBuilder<HomeCubit, HomeState>(
        builder: (context, state) {
          if (state is HomeLoading) {
            return const LoadingWidget();
          } else if (state is HomeError) {
            return ErrorWidget(message: state.message);
          } else if (state is HomeLoaded) {
            return RefreshIndicator(
              onRefresh: () async {
                context.read<HomeCubit>().refreshHomeData();
              },
              child: SingleChildScrollView(
                child: Column(
                  children: [
                    FeaturedPlaylistsSection(playlists: state.homeData.featuredPlaylists),
                    NewReleasesSection(songs: state.homeData.newReleases),
                    TrendingArtistsSection(artists: state.homeData.trendingArtists),
                    Top100Section(songs: state.homeData.top100Songs),
                  ],
                ),
              ),
            );
          }
          return const SizedBox.shrink();
        },
      ),
      bottomNavigationBar: const BottomNavigation(),
    );
  }
}
```

## 🎵 **AUDIO PLAYER IMPLEMENTATION:**

### **Audio Player Service:**
```dart
// services/audio_service.dart
class AudioService {
  final AudioPlayer _audioPlayer;
  
  AudioService() : _audioPlayer = AudioPlayer() {
    _setupAudioPlayer();
  }
  
  void _setupAudioPlayer() {
    _audioPlayer.playerStateStream.listen((state) {
      // Handle player state changes
    });
    
    _audioPlayer.positionStream.listen((position) {
      // Handle position updates
    });
  }
  
  Future<void> playSong(String streamingUrl) async {
    await _audioPlayer.setUrl(streamingUrl);
    await _audioPlayer.play();
  }
  
  Future<void> pause() async {
    await _audioPlayer.pause();
  }
  
  Future<void> resume() async {
    await _audioPlayer.play();
  }
  
  Future<void> seek(Duration position) async {
    await _audioPlayer.seek(position);
  }
  
  Future<void> stop() async {
    await _audioPlayer.stop();
  }
  
  Stream<Duration> get positionStream => _audioPlayer.positionStream;
  Stream<Duration?> get durationStream => _audioPlayer.durationStream;
  Stream<PlayerState> get playerStateStream => _audioPlayer.playerStateStream;
}
```

## 🚀 **IMPLEMENTATION STEPS:**

### **Phase 1: Core Setup**
1. **Setup project structure** với simplified clean architecture
2. **Configure dependency injection** với GetIt
3. **Setup API service** với Dio và interceptors
4. **Create base entities và models**
5. **Setup theme system** với light/dark themes

### **Phase 2: Authentication Feature**
1. **Implement AuthCubit** với login/register logic
2. **Create auth pages** với beautiful UI
3. **Setup JWT token management**
4. **Test authentication flow**

### **Phase 3: Music Features**
1. **Implement HomeCubit** với data loading
2. **Create MusicPlayerCubit** cho audio playback
3. **Build home page** với sections
4. **Implement mini player** và full screen player
5. **Test audio playback** với streaming URLs

### **Phase 4: Search & Discovery**
1. **Implement SearchCubit** cho search functionality
2. **Create search page** với real-time search
3. **Add search filters** và results
4. **Test search integration**

### **Phase 5: Playlist & Social**
1. **Implement PlaylistCubit** cho playlist management
2. **Implement SocialCubit** cho comment system
3. **Create playlist pages** và social features
4. **Test all features** integration

## 🎯 **SUCCESS CRITERIA:**

✅ **Simplified Clean Architecture** với proper separation of concerns
✅ **Cubit/Bloc** state management theo đúng use cases
✅ **Beautiful UI** với light/dark theme support
✅ **API Integration** hoàn chỉnh với tất cả endpoints
✅ **Audio Player** với background playback
✅ **Search Functionality** với real-time results
✅ **Playlist Management** với CRUD operations
✅ **Social Features** với comment system
✅ **Error Handling** comprehensive
✅ **Performance Optimization** với caching
✅ **Simple Project Structure** dễ maintain và scale

## 🚀 **START IMPLEMENTATION:**

**BẮT ĐẦU NGAY với các bước sau:**

1. **Tạo Flutter project** và setup clean architecture
2. **Configure dependency injection** với GetIt
3. **Setup API client** với Dio
4. **Implement AuthCubit** và auth pages
5. **Build HomeBloc** và home page
6. **Create MusicPlayerCubit** và audio player
7. **Complete all features** với proper state management

**QUAN TRỌNG:** Đảm bảo code clean, architecture đúng, và sử dụng Cubit/Bloc phù hợp cho từng feature!

Tạo Flutter Music App hoàn chỉnh với clean architecture và beautiful UI!
```

---

## 📝 **CÁCH SỬ DỤNG:**

1. **Copy toàn bộ prompt** trên
2. **Paste vào AI** (ChatGPT, Claude, Gemini, etc.)
3. **AI sẽ generate** Flutter app với clean architecture
4. **Review code structure** và implementation
5. **Test từng feature** và iterate

## 🎯 **KẾT QUẢ MONG ĐỢI:**

Prompt này sẽ tạo ra:
- ✅ **Clean Architecture** với proper separation
- ✅ **Cubit/Bloc** state management tối ưu
- ✅ **Beautiful UI** với light/dark themes
- ✅ **Complete API Integration** với tất cả endpoints
- ✅ **Audio Player** với full functionality
- ✅ **Optimized Project Structure** dễ maintain
- ✅ **Professional Code Quality** với best practices

**Ready to generate your complete Flutter Music App!** 🎵
