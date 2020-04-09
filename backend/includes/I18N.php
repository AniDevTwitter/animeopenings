<?php
include_once __DIR__ . '/../../vendor/autoload.php';

/**
 * Wrapper class for Translator component.
 * Used mainly for the singleton capacity.
 * Configure once by using configure() then translate with t().
 * 
 */
class I18N {
    const DEFAULT_TYPE = 'messages';

    /**
     * Singleton pattern access
     */
    protected static $singleton = [];

    /**
     * Singleton loading
     * 
     * @return self
     */
    public static function getInstance(string $type = null): self {
        if(null === $type) { $type = static::DEFAULT_TYPE; }
        if(!array_key_exists($type, static::$singleton)) {
            static::$singleton[$type] = new I18N($type);
        }
        return static::$singleton[$type];
    }

    /**
     * Alias of getInstance()
     * @see I18N::getInstance()
     */
    public static function _(string $type = null): self {
        return static::getInstance($type);
    }

    /**
     * Shorthand for getInstance() and trans()
     */
    public static function t(string $str, array $args = [], string $type = null): ?string {
        return static::getInstance($type)->trans($str, $args);
    }

    /**
     * 
     */
    protected $type;

    /**
     * Translator wrapped
     */
    protected $translator = null;

    /**
     * Singleton pattern access
     * @param string $type Type of messages. Default as "messages".
     */
    protected function __construct(string $type) {
        $this->type = $type;
    }

    /**
     * Configure translator component.
     */
    public function init(string $lang): self {
        try {
            $this->translator = new Symfony\Component\Translation\Translator($lang);
            $this->translator->setFallbackLocales(['en_US']); // by default
            $this->translator->addLoader('json_file', new Symfony\Component\Translation\Loader\JsonFileLoader()); // we don't have PSR-4 on all project, so we have to load it manually
            $this->translator->addResource('json_file', __DIR__.'/../../langs/'.$this->type.'.'.$lang.'.json', $lang); // load only the one we need
        } catch(\Exception $e) { // if anything goes south, fallback to a poor anonymous class
            $this->translator = (new class {
                /**
                 * Fallback trans() method. Returns $str as-is with arguments replaced.
                 * Lang argument is ignored, as it won't change anything in such a case.
                 */
                public function trans(string $str, array $args = []) {
                    foreach($args as $k => $v) { $str = str_replace($k, $v, $str); }
                    return $str;
                }

                public function dump() {
                    return [];
                }
            });
            // and log it silently (better to ensure server config btw)
            error_log('Error while loading Translator class (lang: '.$lang.') from Symfony component (see trace below)');
            error_log($e->getMessage());
            error_log($e->getTraceAsString());
        }

        return $this;
    }

    /**
     * Wrapper for Translator::trans()
     */
    public function trans(string $str, array $args = [], string $domain = null, string $lang = null): ?string {
        return empty($this->translator)? null:$this->translator->trans($str, $args, ((null === $domain) && (static::DEFAULT_TYPE !== $this->type))? $this->type:$domain, $lang);
    }

    /**
     * Dump whole catalog
     */
    public function dump() {
        $returns = null;
        if(!empty($this->translator)) {
            $ctl = $this->translator->getCatalogue()->all();
            if(array_key_exists(static::DEFAULT_TYPE, $ctl)) {
                $returns = $ctl[static::DEFAULT_TYPE];
            }
        }
        return $returns;
    }
}
