import Foundation

private struct SignInToken: JsonApiMappable {
    let countryCode: String
    let token: String

    init(data: JsonData, includes: [[String: Any]]?) throws {
        let attributes = data.attributes
        countryCode = try attributes.valueForKey("countryCode")
        token = try attributes.valueForKey("token")
    }
}

struct SignInResponseModel {
    let countryCode: String
    let token: String
    var user: User
    private(set) var reEnabled: Bool = false

    init(signInData: JsonData, includes: [[String: Any]]? = nil, meta: [String: Any]?, links: [String: Any]?) throws {
        let signInToken = try SignInToken(data: signInData, includes: includes)
        countryCode = signInToken.countryCode
        token = signInToken.token
        reEnabled = (try? meta?.valueForKey("reEnabled")) ?? false

        guard
            let includes = includes,
            let relationships = signInData.relationships
        else {
            throw ParsingError.missingField(
                "sirm.signInData.includes_\(includes == nil):relationships_\(signInData.relationships == nil)"
            )
        }

        guard let userData = JsonApi.dataForSingularRelationship(relationships, includes: includes, key: "user") else {
            let relInfo = relationships.nonFatalInfo()
            let inclInfo = includes.nonFatalInfo()
            throw ParsingError.missingField("sirm.signInData.user:\nrel: \(relInfo)\nincl: \(inclInfo)")
        }

        do {
            let user = try User(data: JsonData(dict: userData), includes: includes)
            user.completionUrl = (try? links?.valueForKey("completionUrl")) ?? user.completionUrl
            self.user = user
        }
    }

    init(resetPasswordData: JsonData, includes: [[String: Any]]? = nil, meta: [String: Any]?) throws {
        user = try User(data: resetPasswordData, includes: includes)

        if let meta {
            reEnabled = (try? meta.valueForKey("reEnabled")) ?? false
        }

        guard
            let includes = includes,
            let relationships = resetPasswordData.relationships
        else {
            throw ParsingError.missingField(
                "sirm.rstPassword.includes_\(includes == nil):relationships_\(resetPasswordData.relationships == nil)"
            )
        }

        guard let signInTokenData = JsonApi.dataForSingularRelationship(
            relationships,
            includes: includes,
            key: "accessToken"
        ) else {
            let relInfo = relationships.nonFatalInfo()
            let inclInfo = includes.nonFatalInfo()
            throw ParsingError.missingField("sirm.signInData.accessToken:\nrel: \(relInfo)\nincl: \(inclInfo)")
        }

        do {
            let signInToken = try SignInToken(data: JsonData(dict: signInTokenData), includes: includes)
            countryCode = signInToken.countryCode
            token = signInToken.token
        }
    }
}
