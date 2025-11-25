//
//  NavigationTriggerView.swift
//  sitly
//
//  Created by Kyrylo Filippov on 23/5/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import SwiftUI

struct NavigationTriggerView: View {
    let tag: NavigationKind
    let selection: Binding<NavigationKind?>

    var body: some View {
        NavigationLink(
            destination: buildNavDestinationView(tag),
            tag: tag,
            selection: selection,
            label: { EmptyView() }
        )
    }
}
