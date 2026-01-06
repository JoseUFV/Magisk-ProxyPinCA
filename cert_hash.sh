#!/system/bin/sh
# Helper script to generate proper certificate hash using OpenSSL
# This script can be called from the WebUI via KernelSU exec

CERT_FILE="$1"

if [ -z "$CERT_FILE" ] || [ ! -f "$CERT_FILE" ]; then
    echo "Error: Certificate file not found"
    exit 1
fi

# Try to get the subject hash using openssl
if command -v openssl >/dev/null 2>&1; then
    # Modern Android may have openssl
    HASH=$(openssl x509 -subject_hash_old -in "$CERT_FILE" 2>/dev/null | head -1)
    
    if [ -z "$HASH" ]; then
        # Fallback to regular hash if old hash fails
        HASH=$(openssl x509 -subject_hash -in "$CERT_FILE" 2>/dev/null | head -1)
    fi
    
    if [ -n "$HASH" ]; then
        echo "$HASH"
        exit 0
    fi
fi

# If openssl is not available or failed, generate a pseudo-hash using SHA-256
# This is more secure than MD5 for fallback purposes
if command -v sha256sum >/dev/null 2>&1; then
    PSEUDO_HASH=$(cat "$CERT_FILE" | grep -v "BEGIN\|END" | head -5 | sha256sum | cut -c1-8)
    echo "$PSEUDO_HASH"
else
    # Last resort: use a timestamp-based hash
    PSEUDO_HASH=$(date +%s | sha1sum 2>/dev/null | cut -c1-8 || echo "$(date +%s)")
    echo "$PSEUDO_HASH"
fi
