begin;

alter table public.class_meetings
  add column repeat_every_weeks integer not null default 1
    check (repeat_every_weeks in (1, 2)),

  add column excluded_dates date[] not null default '{}'
    check (array_position(excluded_dates, null) is null);

commit;