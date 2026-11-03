import Foundation
import Capacitor
import WidgetKit

/// Writes the small gold-goal snapshot into the App Group so the widget can read it.
/// The full workspace, including photos, stays in the app's own files.
@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetBridgePlugin"
    public let jsName = "WidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setSnapshot", returnType: CAPPluginReturnPromise)
    ]

    @objc func setSnapshot(_ call: CAPPluginCall) {
        let json = call.getString("json") ?? "{\"goals\":[]}"
        if let defaults = UserDefaults(suiteName: "group.com.statego2.itworks") {
            defaults.set(json, forKey: "goldSnapshot")
        }
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        call.resolve()
    }
}
