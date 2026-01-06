#!/system/bin/sh


exec > /data/local/tmp/ProxyPinCA.log
exec 2>&1

#set -x

MODDIR=${0%/*}

set_context() {
    [ "$(getenforce)" = "Enforcing" ] || return 0

    default_selinux_context=u:object_r:system_file:s0
    selinux_context=$(ls -Zd $1 | awk '{print $1}')

    if [ -n "$selinux_context" ] && [ "$selinux_context" != "?" ]; then
        chcon -R $selinux_context $2
    else
        chcon -R $default_selinux_context $2
    fi
}

#LOG_PATH="/data/local/tmp/ProxyPinCA.log"
echo "[$(date +%F) $(date +%T)] - Certificate Manager post-fs-data.sh start."
chown -R 0:0 ${MODDIR}/system/etc/security/cacerts

# Check if certificate directory exists
if [ ! -d "${MODDIR}/system/etc/security/cacerts" ]; then
    echo "[$(date +%F) $(date +%T)] - Certificate directory not found. Creating..."
    mkdir -p ${MODDIR}/system/etc/security/cacerts
fi

# Count certificates
CERT_COUNT=$(ls -1 ${MODDIR}/system/etc/security/cacerts/*.0 2>/dev/null | wc -l)
echo "[$(date +%F) $(date +%T)] - Found ${CERT_COUNT} certificate(s) to install."

if [ "$CERT_COUNT" -eq 0 ]; then
    echo "[$(date +%F) $(date +%T)] - No certificates found. Exiting."
    exit 0
fi

if [ -d /apex/com.android.conscrypt/cacerts ]; then
    # Android 14+ with apex certificate directory
    echo "[$(date +%F) $(date +%T)] - Android 14+ detected."

    TEMP_DIR=/data/local/tmp/cacerts-copy
    rm -rf "$TEMP_DIR"
    mkdir -p -m 700 "$TEMP_DIR"
    mount -t tmpfs tmpfs "$TEMP_DIR"

    # Copy system certificates to temporary directory
    cp -f /apex/com.android.conscrypt/cacerts/* "$TEMP_DIR"
    
    # Copy all custom certificates from module
    echo "[$(date +%F) $(date +%T)] - Copying custom certificates..."
    cp -f ${MODDIR}/system/etc/security/cacerts/*.0 "$TEMP_DIR/" 2>/dev/null || true

    chown -R 0:0 "$TEMP_DIR"
    set_context /apex/com.android.conscrypt/cacerts "$TEMP_DIR"

    # Check if certificates were successfully added
    CERTS_NUM="$(ls -1 "$TEMP_DIR" | wc -l)"
    echo "[$(date +%F) $(date +%T)] - Total certificates in temp directory: ${CERTS_NUM}"
    
    if [ "$CERTS_NUM" -gt 10 ]; then
        mount -o bind "$TEMP_DIR" /apex/com.android.conscrypt/cacerts
        for pid in 1 $(pgrep zygote) $(pgrep zygote64); do
            nsenter --mount=/proc/${pid}/ns/mnt -- \
                mount --bind "$TEMP_DIR" /apex/com.android.conscrypt/cacerts
        done
        echo "[$(date +%F) $(date +%T)] - Mount success! ${CERT_COUNT} custom certificate(s) installed."
    else
        echo "[$(date +%F) $(date +%T)] - Mount failed!"
    fi

    # Unmount temporary directory
    umount "$TEMP_DIR"
    rmdir "$TEMP_DIR"
else
    # Android version lower than 14
    echo "[$(date +%F) $(date +%T)] - Android version lower than 14 detected"
    set_context /system/etc/security/cacerts ${MODDIR}/system/etc/security/cacerts 
    echo "[$(date +%F) $(date +%T)] - Mount success! ${CERT_COUNT} custom certificate(s) installed."
fi