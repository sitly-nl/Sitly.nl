import SwiftUI

struct CountrySelector: View {
    var countries: [Country] = []
    var close: (() -> Void)
    var select: ((Country) -> Void)
    @State var selectedCountry: Country

    struct RoundedRectangleButtonStyle: ButtonStyle {
        func makeBody(configuration: ButtonStyleConfiguration) -> some View {
            HStack {
                Spacer()
                configuration.label
                    .foregroundColor(.white)
                    .font(Font(UIFont.openSansSemiBold(size: 17)))
                Spacer()
            }
            .padding()
            .background(Color(.primary500).cornerRadius(4))
            .scaleEffect(configuration.isPressed ? 0.95 : 1)
        }
    }

    struct BorderedButtonStyle: ButtonStyle {
        func makeBody(configuration: ButtonStyleConfiguration) -> some View {
            HStack {
                Spacer()
                configuration.label
                    .foregroundColor(Color(.neutral900))
                    .font(Font(UIFont.openSansSemiBold(size: 17)))
                Spacer()
            }
            .padding()
            .overlay(
                RoundedRectangle(cornerRadius: 4)
                    .stroke(Color(.neutral900), lineWidth: 1)
            )
            .scaleEffect(configuration.isPressed ? 0.95 : 1)
        }
    }

    var body: some View {
        VStack(alignment: .trailing) {
            Color.clear
            ZStack {
                Color.white.edgesIgnoringSafeArea(.all)
                VStack {
                    Text("error.server.emailInMultipleCountries".localized)
                        .multilineTextAlignment(.center)
                        .font(Font(UIFont.openSansSemiBold(size: 17)))
                        .foregroundColor(Color(UIColor.neutral900))
                    Picker("Please choose a color", selection: $selectedCountry) {
                        ForEach(countries, id: \.self) {
                            Text($0.rawValue.localized)
                        }
                    }.pickerStyle(.wheel)
                    HStack(spacing: 40) {
                        Spacer()
                        Button("cancel".localized) {
                            close()
                        }.buttonStyle(BorderedButtonStyle())
                        Button("continue".localized) {
                            select(selectedCountry)
                        }.buttonStyle(RoundedRectangleButtonStyle())
                        Spacer()
                    }
                }
            }.cornerRadius(20)
        }
    }
}

struct CountrySelector_Previews: PreviewProvider {
    static var previews: some View {
        CountrySelector(countries: Country.values, close: {}, select: { _ in }, selectedCountry: Country.italy)
    }
}
