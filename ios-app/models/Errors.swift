import Foundation

enum ParsingError: Error {
    case general(Error)
    case missingField(String)

    static var general = ParsingError.general(
        NSError(
            domain: "generalParsingError",
            code: 0,
            userInfo: nil
        )
    )
}
