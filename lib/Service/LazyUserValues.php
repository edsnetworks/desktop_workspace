<?php
namespace OCA\DesktopWorkspace\Service;

use OCP\Config\IUserConfig;
use OCP\IConfig;

/**
 * Per-user values that can be large (JSON blobs: window states, icon positions, pins).
 *
 * Nextcloud loads every non-lazy user value on each request and warns when one exceeds 128 bytes
 * ("should be declared as lazy"). These values are stored as lazy instead. Values written by older
 * versions are non-lazy: they are still read, and become lazy the next time they are saved.
 */
class LazyUserValues {
    private const APP_ID = 'desktop_workspace';

    public function __construct(
        private IUserConfig $userConfig,
        private IConfig $config,
    ) {
    }

    public function get(string $uid, string $key, string $default = ''): string {
        try {
            $value = $this->userConfig->getValueString($uid, self::APP_ID, $key, '', true);
            if ($value !== '') {
                return $value;
            }
        } catch (\Throwable $e) {
            // fall through to the legacy read
        }
        // Value saved by a previous version (not lazy).
        return $this->config->getUserValue($uid, self::APP_ID, $key, $default);
    }

    public function set(string $uid, string $key, string $value): void {
        $this->userConfig->setValueString($uid, self::APP_ID, $key, $value, true);
    }

    public function delete(string $uid, string $key): void {
        $this->userConfig->deleteUserConfig($uid, self::APP_ID, $key);
    }
}
