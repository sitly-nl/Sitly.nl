import Foundation

enum ValidationError: String, LocalizedError {
    case notFilledAllFields

    var errorDescription: String? {
        return "error.userInputValidation.\(rawValue)".localized
    }
}

enum ViewState<T: LocalizedError> where T: Equatable {
    case disabled(error: ValidationError?)
    case enabled(error: T?)

    var enabled: Bool {
        if case .enabled = self {
            return true
        }
        return false
    }

    var error: LocalizedError? {
        switch self {
        case .disabled(let error):
            if error != nil {
                return error
            }
        case .enabled(let error):
            if error != nil {
                return error
            }
        }
        return nil
    }
}
