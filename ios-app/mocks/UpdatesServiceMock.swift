//
//  UpdatesServiceMock.swift
//  sitly
//
//  Created by Kyrylo Filippov on 7/3/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import Foundation
import Combine

#if DEBUG
class UpdatesServiceMock: UpdatesServiceable {
    var updatesPublisher: AnyPublisher<UpdateModel, Never> {
        updatesPublisherSubject.eraseToAnyPublisher()
    }
    var updatesPublisherSubject = PassthroughSubject<UpdateModel, Never>()

    var update: UpdateModel?

    var jobPosting: JobPosting?

    var pendingPrompts: [PromptType] = []

    func fetchUpdates(completion: (() -> Void)?) {
    }

    func resetTimer(enabled: Bool) {
    }

    func handle(type: PromptType, delay: Double) {
    }

    func clearJobPosting() {
    }
}
#endif
