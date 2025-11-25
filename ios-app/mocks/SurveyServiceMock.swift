//
//  SurveyServiceMock.swift
//  sitly
//
//  Created by Kyrylo Filippov on 5/6/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import Foundation

class SurveyServiceMock: SurveyServiceable {
    var canShowSurveyURL: URL?

    func didSendInvite() {
    }

    func didReceiveInvites(count: Int) {
    }

    func didVisitedInviteTab() {
    }
}
