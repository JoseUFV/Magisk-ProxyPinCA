# Certificate Manager (Extended ProxyPin Module)

A KernelSU/Magisk module with WebUI for managing custom CA certificates in Android's system trust store.

## 🌟 Features

- **WebUI Interface**: User-friendly web interface for certificate management
- **Universal Support**: Install any CA certificate, not just ProxyPin
- **Android 14+ Compatible**: Works with Android 5.0 through Android 14+
- **Multiple Certificates**: Manage multiple custom certificates simultaneously
- **Drag & Drop Upload**: Easy certificate upload via drag-and-drop or file selection
- **Safe Management**: Preserves default ProxyPin certificate

## 📱 Compatibility

- Android 5.0+ (Lollipop and newer)
- Android 14+ with APEX certificate system
- Requires KernelSU or Magisk root

## 🚀 Installation

1. Download the module ZIP file
2. Install via KernelSU Manager or Magisk Manager
3. Reboot your device
4. Access the WebUI from KernelSU/Magisk Manager

## 💡 Usage

### Using the WebUI

1. Open KernelSU/Magisk Manager
2. Navigate to the Certificate Manager module
3. Click on "Open WebUI" or the module settings
4. Upload your CA certificates (`.pem`, `.crt`, or `.cer` formats)
5. Click "Apply Changes"
6. Reboot your device for changes to take effect

### Supported Certificate Formats

- PEM format (`.pem`)
- CRT format (`.crt`)
- CER format (`.cer`)

### Certificate Requirements

Certificates must be in PEM format with proper headers:
```
-----BEGIN CERTIFICATE-----
[certificate data]
-----END CERTIFICATE-----
```

## 🔧 Technical Details

### Module Structure

```
ProxyPinCA/
├── module.prop
├── customize.sh
├── post-fs-data.sh
├── system/
│   └── etc/
│       └── security/
│           └── cacerts/
│               └── 243f0bfb.0  (default ProxyPin cert)
├── webroot/
│   ├── index.html
│   ├── style.css
│   └── script.js
└── uploads/
    └── (user uploaded certificates)
```

### How It Works

1. **Upload**: Certificates are uploaded via WebUI and stored in `/data/adb/modules/ProxyPinCA/uploads/`
2. **Apply**: When you click "Apply Changes", certificates are copied to `system/etc/security/cacerts/`
3. **Boot**: On device boot, `post-fs-data.sh` mounts all certificates into the system trust store
4. **Android 14+**: Uses APEX mount binding for `/apex/com.android.conscrypt/cacerts`
5. **Android <14**: Uses traditional `/system/etc/security/cacerts` mounting

## 📚 Original ProxyPin Project

This module extends the original ProxyPin certificate installer:
- **Original Repository**: https://github.com/wanghongenpin/network_proxy_flutter
- **Default Certificate**: ProxyPin CA certificate is included by default

## 🔍 Alternative Modules

If you experience issues, try:
- https://github.com/ys1231/MoveCertificate

## 🛠️ Development

### Building from Source

The module uses standard KernelSU/Magisk module structure. To build:

1. Clone this repository
2. Ensure all files have correct permissions
3. Create a ZIP archive maintaining the directory structure
4. Sign the ZIP if required by your root solution

### WebUI Development

The WebUI is built with:
- Vanilla HTML5/CSS3/JavaScript
- KernelSU JavaScript API for system operations
- Responsive design for mobile devices

To test the WebUI locally, you can open `webroot/index.html` in a browser, though system operations will require actual KernelSU environment.

## 📄 License

This module extends the original ProxyPin certificate installer. Please refer to the LICENSE file for details.

## ⚠️ Disclaimer

Installing custom CA certificates can be a security risk. Only install certificates from trusted sources. This module is provided as-is without warranty.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues.

## 📞 Support

For issues related to:
- **Certificate installation**: Check the logs at `/data/local/tmp/ProxyPinCA.log`
- **WebUI problems**: Check browser console and KernelSU logs
- **ProxyPin app**: Visit the original ProxyPin repository

## 📝 Changelog

### v2.0.0
- Added WebUI for certificate management
- Support for multiple custom certificates
- Extended beyond ProxyPin-specific certificates
- Improved certificate installation for Android 14+
- Enhanced logging and error handling

### v1.2.0 (Original)
- ProxyPin certificate installation
- Android 14+ support
