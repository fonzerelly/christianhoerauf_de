"""Der Standardrechner (Mac mini) für Integrationstests und Fingerabdrücke.

Die Liste aller Rechner steht in `targets.py`; hier nur die Kurznamen für den Standard.
"""

from testsammlung.targets import DEFAULT_TARGET, LM_STUDIO_HOSTS

LM_STUDIO_URL = LM_STUDIO_HOSTS[DEFAULT_TARGET].url
LM_STUDIO_MODEL = LM_STUDIO_HOSTS[DEFAULT_TARGET].model
