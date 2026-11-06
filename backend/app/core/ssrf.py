import socket
import ipaddress
from urllib.parse import urlparse
from typing import Tuple

BLOCKED_HOSTNAMES = {
    "instance-data",
    "metadata.google.internal",
    "metadata.azure.com",
    "169.254.169.254",
    "fd00:ec2::254",
}

CLOUD_METADATA_IPS = {
    ipaddress.ip_network("169.254.169.254/32"),
    ipaddress.ip_network("169.254.169.253/32"),
}

def is_ip_private_or_loopback(ip_str: str) -> bool:
    """Check whether an IP address is loopback, link-local, private, or multicast."""
    try:
        ip = ipaddress.ip_address(ip_str)
        return (
            ip.is_private or
            ip.is_loopback or
            ip.is_link_local or
            ip.is_multicast or
            ip.is_reserved or
            ip.is_unspecified
        )
    except ValueError:
        return True

def validate_target_url(url: str, allow_private_subnets: bool = False) -> Tuple[bool, str]:
    """
    Validate target URL against SSRF and prohibited networks.
    If allow_private_subnets is True, loopback/private IPs (e.g. localhost for demo-lab)
    are permitted ONLY if explicitly confirmed by the authorized user,
    but cloud metadata IP addresses are strictly forbidden at all times.
    """
    if not url or not isinstance(url, str):
        return False, "Target URL must be a non-empty string"
    
    parsed = urlparse(url.strip())
    if parsed.scheme not in ("http", "https"):
        return False, "Only HTTP and HTTPS protocols are supported"
    
    hostname = parsed.hostname
    if not hostname:
        return False, "Target URL must contain a valid hostname or IP address"
    
    hostname_lower = hostname.lower()
    if hostname_lower in BLOCKED_HOSTNAMES:
        return False, "Access to cloud metadata and instance services is strictly forbidden"
    
    try:
        resolved_ips = socket.getaddrinfo(hostname, None)
    except socket.gaierror:
        return False, f"Could not resolve host '{hostname}' via DNS"
    
    for item in resolved_ips:
        ip_str = item[4][0]
        try:
            ip_obj = ipaddress.ip_address(ip_str)
            # Never permit cloud metadata IP under any circumstances
            for meta_net in CLOUD_METADATA_IPS:
                if ip_obj in meta_net:
                    return False, "Forbidden access: target resolves to cloud metadata IP range"
            
            if is_ip_private_or_loopback(ip_str):
                if not allow_private_subnets:
                    return False, f"Prohibited address: Host '{hostname}' resolves to private/loopback IP {ip_str}. Enable 'Authorized Local/Internal Target' if testing an authorized internal API."
        except ValueError:
            return False, f"Invalid resolved IP address: {ip_str}"
            
    return True, "Valid target URL"

