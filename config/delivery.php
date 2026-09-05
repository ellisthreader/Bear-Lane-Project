<?php

return [
    'timezone' => 'Europe/London',
    'cutoff_hour' => 16,

    // Non-delivery days used for selectable dates and ship-date calculation.
    'uk_bank_holidays' => [
        '2026-01-01',
        '2026-04-03',
        '2026-04-06',
        '2026-05-04',
        '2026-05-25',
        '2026-08-31',
        '2026-12-25',
        '2026-12-28',
        '2027-01-01',
        '2027-03-26',
        '2027-03-29',
        '2027-05-03',
        '2027-05-31',
        '2027-08-30',
        '2027-12-27',
        '2027-12-28',
    ],

    'pricing' => [
        'STANDARD' => 5.95,
        'NEXT_DAY' => 7.95,
        'TIMED' => 10.95,
    ],

    'slot' => [
        'capacity' => 25,
        'hold_minutes' => 15,
    ],
];
