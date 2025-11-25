import Foundation

struct InstagramToken: Codable {
    var instagramAccessToken: String
    var instagramUserId: Int
}

struct Feed: Codable {
    var data: [InstagramMediaData]
    var paging: PagingData?
}

struct InstagramMediaData: Codable {
    var id: String
    var caption: String?
    var mediaType: MediaType
    var mediaUrl: String
}

struct PagingData: Codable {
    var cursors: CursorData
    var next: String?
}

struct CursorData: Codable {
    var before: String
    var after: String
}

enum MediaType: String, Codable {
    case image = "IMAGE"
    case video = "VIDEO"
    case carouselAlbum = "CAROUSEL_ALBUM"
}
