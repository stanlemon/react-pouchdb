# Changelog

## 0.1.15 (July 12, 2020)

* Fixed not setting up sync on mount (still need to do that!).

## 0.1.14 (July 12, 2020)

* Syncing is not setup on subsequent property updates, in case the `remote` on `<Database />` was not set when the component was first mounted.