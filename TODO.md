# TODO

Below is a list of items I would like to address but that did not take away from any of the requirement satisfactions for the 6388 Mini Project.

1. Change `currentMarking` attribute of Place concept in the metamodel to `initialTokens` to more accurately reflect its meaning since the value of this attribute on the model itself does not change during the simulation; only the visual elements change, i.e. `currentMarking` is only "current" initially.
2. Change the multi-event-firing mechanism (for firing multiple enabled transitions at once) to use an interleaved firing approach rather than simultaneous to avoid the issue outlined in [DEV.md](DEV.md).
