//
//  ErrorsReporterService.swift
//  sitly
//
//  Created by Kyrylo Filippov on 10/4/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import Foundation
import Sentry
import StoreKit

protocol ErrorsReporterServiceable {
    func report(error: NSError)
}

class ErrorsReporterService: ErrorsReporterServiceable {
    private let reportQueue = DispatchQueue.global(qos: .background)

    func report(error: NSError) {
        reportQueue.async { [weak self] in
            self?.performSend(error: error)
        }
    }

    private func performSend(error: NSError) {
#if DEBUG
        Logger.log("Submitting errors to Sentry is disabled in Debug builds. Tried to submit\n \(error)")
#else
        let evt = Event(error: error)
        evt.level = .warning
        evt.type = "non-fatal"
        evt.message = SentryMessage(formatted: "Non-fatal: \(error.domain).\(error.code)")
        evt.fingerprint = [error.domain.trim(), "\(error.domain).\(error.code)"]
        evt.extra = error.userInfo
        SentrySDK.capture(event: evt)
#endif
    }
}

enum AuthErrorKind: NSErrorProvidable {
    case regularAuthFailed(Error)
    case facebookAuthFailed(FacebookStatus)
    case googleAuthFailed(Error)
    case appleAuthFailed(Error)
    case signUpFailed(Error)
    case completeSignUpFailed(Error)
    case resetPasswordFailed(Error)

    var description: String {
        switch self {
        case .regularAuthFailed(let error): return "regularAuthFailed: \(error)"
        case .facebookAuthFailed(let status):
            return "facebookAuthFailed: \(status.debugDescription)"
        case .googleAuthFailed(let error): return "googleAuthFailed: \(error)"
        case .appleAuthFailed(let error): return "appleAuthFailed: \(error)"
        case .signUpFailed(let error): return "signUpFailed: \(error)"
        case .completeSignUpFailed(let error): return "completeSignUpFailed: \(error)"
        case .resetPasswordFailed(let error): return "resetPasswordFailed: \(error)"
        }
    }

    var errorCode: Int {
        switch self {
        case .regularAuthFailed: return 400
        case .facebookAuthFailed: return 401
        case .googleAuthFailed: return 402
        case .appleAuthFailed: return 403
        case .signUpFailed: return 404
        case .completeSignUpFailed: return 405
        case .resetPasswordFailed: return 406
        }
    }

    var domain: String { "sitly.auth.error" }
}

enum SubscriptionsErrorKind: NSErrorProvidable {
    case receiptValidationFailed(Error)
    case purchaseFailed(SKError)

    var description: String {
        switch self {
        case .receiptValidationFailed(let error): return "receiptValidationFailed: \(error)"
        case .purchaseFailed(let error): return "purchaseFailed: \(error.code.errorName)"
        }
    }

    var errorCode: Int {
        switch self {
        case .receiptValidationFailed: return 300
        case .purchaseFailed(let error): return error.errorCode
        }
    }

    var domain: String { "sitly.subscriptions.error" }
}

enum APIErrorKind: NSErrorProvidable {
    case sendMessageFailed(ServerBaseError)

    var description: String {
        if case .sendMessageFailed(let error) = self {
            return "sendMessageFailed: \(error.errorDescription ?? "")"
        } else {
            return "sendMessageFailed"
        }
    }

    var errorCode: Int {
        return 500
    }

    var domain: String { "sitly.api.error" }
}

protocol NSErrorProvidable: CustomStringConvertible {
    var domain: String { get }
    var errorCode: Int { get }
}

extension NSErrorProvidable {
    var asNSError: NSError {
        var userInfo = [String: Any]()
        userInfo["sitly_error"] = description
        return NSError(domain: domain, code: errorCode, userInfo: userInfo)
    }
}

extension SKError.Code {
    var errorName: String {
        switch self {
        case .unknown:
            return "unknown"
        case .clientInvalid:
            return "clientInvalid"
        case .paymentCancelled:
            return "paymentCancelled"
        case .paymentInvalid:
            return "paymentInvalid"
        case .paymentNotAllowed:
            return "paymentNotAllowed"
        case .storeProductNotAvailable:
            return "storeProductNotAvailable"
        case .cloudServicePermissionDenied:
            return "cloudServicePermissionDenied"
        case .cloudServiceNetworkConnectionFailed:
            return "cloudServiceNetworkConnectionFailed"
        case .cloudServiceRevoked:
            return "cloudServiceRevoked"
        case .privacyAcknowledgementRequired:
            return "privacyAcknowledgementRequired"
        case .unauthorizedRequestData:
            return "unauthorizedRequestData"
        case .invalidOfferIdentifier:
            return "invalidOfferIdentifier"
        case .invalidSignature:
            return "invalidSignature"
        case .missingOfferParams:
            return "missingOfferParams"
        case .invalidOfferPrice:
            return "invalidOfferPrice"
        case .overlayCancelled:
            return "overlayCancelled"
        case .overlayInvalidConfiguration:
            return "overlayInvalidConfiguration"
        case .overlayTimeout:
            return "overlayTimeout"
        case .ineligibleForOffer:
            return "ineligibleForOffer"
        case .unsupportedPlatform:
            return "unsupportedPlatform"
        case .overlayPresentedInBackgroundScene:
            return "overlayPresentedInBackgroundScene"
        @unknown default:
            return "unknown"
        }
    }
}
