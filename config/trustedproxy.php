<?php

$configuredProxies = array_values(array_filter(array_map(
    'trim',
    explode(',', (string) env('TRUSTED_PROXIES', ''))
)));

return [
    // Empty means Laravel will not trust caller-supplied forwarding headers.
    'proxies' => $configuredProxies,
];
