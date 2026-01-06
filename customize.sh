#!/system/bin/sh

SKIPUNZIP=0

ASH_STANDALONE=0

ui_print "开始安装模块 / Starting module installation"
ui_print " "

ui_print "📜 Certificate Manager - Extended Module"
ui_print " "

ui_print "提取模块文件 / Extracting module files"

# Extract system directory (contains default ProxyPin cert)
unzip -o "$ZIPFILE" 'system/*' -d $MODPATH >&2

# Extract webroot directory for WebUI
unzip -o "$ZIPFILE" 'webroot/*' -d $MODPATH >&2

# Create uploads directory for user certificates
mkdir -p $MODPATH/uploads

ui_print " "
ui_print "✅ 安装成功 / Installation successful"
ui_print " "
ui_print "📱 使用 WebUI 管理证书 / Use WebUI to manage certificates"
ui_print "🔄 重启后生效 / Reboot to apply changes"
ui_print " "

set_perm_recursive $MODPATH 0 0 0755 0644

# Ensure WebUI files have correct permissions
set_perm_recursive $MODPATH/webroot 0 0 0755 0644

# Ensure upload directory exists with correct permissions
mkdir -p $MODPATH/uploads
chmod 755 $MODPATH/uploads