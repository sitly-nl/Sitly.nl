//
//  ActivityIndicatorView.swift
//  sitly
//
//  Created by Kyrylo Filippov on 22/3/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import SwiftUI

struct ActivityIndicatorView: View {
    let image: UIImage
    @State private var isAnimating: Bool = false

    init(image: UIImage = .loader) {
        self.image = image
    }

    var body: some View {
        Image(uiImage: image)
            .resizable()
            .scaledToFit()
            .frame(width: 24, height: 24)
            .rotationEffect(Angle(degrees: isAnimating ? 360 : 0), anchor: .center)
            .onAppear {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                    withAnimation(.linear(duration: 1).repeatForever(autoreverses: false)) {
                        isAnimating = true
                    }
                }
            }
    }
}

#if DEBUG
#Preview {
    ActivityIndicatorView()
}
#endif
