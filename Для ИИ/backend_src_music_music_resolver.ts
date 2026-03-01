import { Resolver, Query, Mutation, Args, Int, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { MusicService } from './music.service';
import { Track, Artist } from './models/track.model';
import { Playlist } from './models/playlist.model';
import { CreatePlaylistInput, UpdatePlaylistInput } from './dto/create-playlist.input';
import { 
  CreateArtistInput, 
  CreateAlbumInput, 
  CreateTrackInput, 
  UpdateTrackInput, 
  UpdateArtistInput, 
  UpdateAlbumInput 
} from './dto/admin-music.input';
import { Album } from './models/album.model';
import { SearchResults } from './models/search-results.model';

@Resolver(() => Track)
export class MusicResolver {
  constructor(private readonly musicService: MusicService) {}

  // === ПОЛЬЗОВАТЕЛЬСКИЕ ЗАПРОСЫ ===
  @Query(() => [Track])
@UseGuards(JwtAuthGuard)
async musicRecommendations(
  @Context() ctx,
  @Args('skip', { type: () => Int, nullable: true }) skip: number,
  @Args('take', { type: () => Int, nullable: true }) take: number,
) {
  return this.musicService.getRecommendations(ctx.req.user.userId, skip || 0, take || 20);
}

  @Query(() => SearchResults) // <-- Было [Track], стало SearchResults
  @UseGuards(JwtAuthGuard)
  async searchMusic(@Context() ctx, @Args('query') query: string) {
    return this.musicService.search(query, ctx.req.user.userId);
  }

  @Query(() => [Track])
  @UseGuards(JwtAuthGuard)
  async myMusicLibrary(@Context() ctx) {
    return this.musicService.getMyLibrary(ctx.req.user.userId);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async toggleTrackLike(@Context() ctx, @Args('trackId', { type: () => Int }) trackId: number) {
    return this.musicService.toggleLike(ctx.req.user.userId, trackId);
  }

  @Mutation(() => Boolean)
@UseGuards(JwtAuthGuard)
async recordPlayback(
  @Context() ctx,
  @Args('trackId', { type: () => Int }) trackId: number,
) {
  await this.musicService.recordPlayback(ctx.req.user.userId, trackId);
  return true;
}

@Query(() => [Track])
@UseGuards(JwtAuthGuard)
async myRecentHistory(@Context() ctx) {
  return this.musicService.getRecentHistory(ctx.req.user.userId);
}

  @Query(() => [Playlist])
  @UseGuards(JwtAuthGuard)
  async myPlaylists(@Context() ctx) {
    return this.musicService.getMyPlaylists(ctx.req.user.userId);
  }

  @Query(() => Playlist, { nullable: true })
  @UseGuards(JwtAuthGuard)
  async playlist(@Context() ctx, @Args('id', { type: () => Int }) id: number) {
    return this.musicService.getPlaylist(id, ctx.req.user.userId);
  }

  @Mutation(() => Playlist)
  @UseGuards(JwtAuthGuard)
  async createPlaylist(@Context() ctx, @Args('input') input: CreatePlaylistInput) {
    return this.musicService.createPlaylist(ctx.req.user.userId, input);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async deletePlaylist(@Context() ctx, @Args('id', { type: () => Int }) id: number) {
    return this.musicService.deletePlaylist(id, ctx.req.user.userId);
  }

  @Mutation(() => Playlist)
  @UseGuards(JwtAuthGuard)
  async updatePlaylist(@Context() ctx, @Args('input') input: UpdatePlaylistInput) {
    return this.musicService.updatePlaylist(ctx.req.user.userId, input);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async addTrackToPlaylist(@Context() ctx, @Args('playlistId', { type: () => Int }) playlistId: number, @Args('trackId', { type: () => Int }) trackId: number) {
      return this.musicService.addTrackToPlaylist(ctx.req.user.userId, playlistId, trackId);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async removeTrackFromPlaylist(@Context() ctx, @Args('playlistId', { type: () => Int }) playlistId: number, @Args('trackId', { type: () => Int }) trackId: number) {
      return this.musicService.removeTrackFromPlaylist(ctx.req.user.userId, playlistId, trackId);
  }

  // === АДМИНСКИЕ ЗАПРОСЫ ===
  @Mutation(() => Artist)
  @UseGuards(JwtAuthGuard, AdminGuard)
  async createArtistAdmin(@Args('input') input: CreateArtistInput) {
    return this.musicService.createArtist(input);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard, AdminGuard)
  async createAlbumAdmin(@Args('input') input: CreateAlbumInput) {
    await this.musicService.createAlbum(input);
    return true;
  }

  @Mutation(() => Track)
  @UseGuards(JwtAuthGuard, AdminGuard)
  async createTrackAdmin(@Args('input') input: CreateTrackInput) {
    return this.musicService.createTrack(input);
  }

  @Query(() => [Artist])
  @UseGuards(JwtAuthGuard, AdminGuard)
  async searchArtistsAdmin(@Args('query') query: string) {
    return this.musicService.searchArtistsForAdmin(query);
  }

  @Query(() => Artist, { nullable: true })
  @UseGuards(JwtAuthGuard)
  async getArtist(@Args('id', { type: () => Int }) id: number) {
    return this.musicService.getArtist(id);
  }

  @Query(() => Album, { nullable: true })
  @UseGuards(JwtAuthGuard)
  async getAlbum(@Context() ctx, @Args('id', { type: () => Int }) id: number) {
    return this.musicService.getAlbum(id, ctx.req.user.userId);
  }

  @Query(() => [Track])
  @UseGuards(JwtAuthGuard)
  async getArtistTopTracks(@Context() ctx, @Args('artistId', { type: () => Int }) artistId: number) {
    return this.musicService.getArtistTopTracks(artistId, ctx.req.user.userId);
  }

  @Query(() => [Album])
  @UseGuards(JwtAuthGuard)
  async getArtistAlbums(@Args('artistId', { type: () => Int }) artistId: number) {
    return this.musicService.getArtistAlbums(artistId);
  }

  @Query(() => [Track])
@UseGuards(JwtAuthGuard, AdminGuard)
async adminGetAllTracks(
  @Args('query', { type: () => String, nullable: true }) query?: string,
  @Args('skip', { type: () => Int, nullable: true }) skip?: number
) {
  return this.musicService.adminGetAllTracks(query, skip);
}

@Query(() => [Album])
@UseGuards(JwtAuthGuard, AdminGuard)
async adminGetAllAlbums(
  @Args('query', { type: () => String, nullable: true }) query?: string,
  @Args('skip', { type: () => Int, nullable: true }) skip?: number
) {
  return this.musicService.adminGetAllAlbums(query, skip);
}

@Query(() => [Artist])
@UseGuards(JwtAuthGuard, AdminGuard)
async adminGetAllArtists(
  @Args('query', { type: () => String, nullable: true }) query?: string,
  @Args('skip', { type: () => Int, nullable: true }) skip?: number
) {
  return this.musicService.adminGetAllArtists(query, skip);
}

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard, AdminGuard)
  async adminDeleteTrack(@Args('id', { type: () => Int }) id: number) {
    return this.musicService.deleteTrack(id);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard, AdminGuard)
  async adminDeleteAlbum(@Args('id', { type: () => Int }) id: number) {
    return this.musicService.deleteAlbum(id);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard, AdminGuard)
  async adminDeleteArtist(@Args('id', { type: () => Int }) id: number) {
    return this.musicService.deleteArtist(id);
  }

  @Mutation(() => Track)
  @UseGuards(JwtAuthGuard, AdminGuard)
  async adminUpdateTrack(@Args('input') input: UpdateTrackInput) {
    return this.musicService.updateTrack(input);
  }

  @Mutation(() => Artist)
  @UseGuards(JwtAuthGuard, AdminGuard)
  async adminUpdateArtist(@Args('input') input: UpdateArtistInput) {
    return this.musicService.adminUpdateArtist(input);
  }

  @Mutation(() => Album)
  @UseGuards(JwtAuthGuard, AdminGuard)
  async adminUpdateAlbum(@Args('input') input: UpdateAlbumInput) {
    return this.musicService.adminUpdateAlbum(input);
  }
}