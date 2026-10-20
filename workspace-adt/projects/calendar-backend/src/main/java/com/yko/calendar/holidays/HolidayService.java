package com.yko.calendar.holidays;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class HolidayService {

    private final HolidayRepository holidayRepository;

    public HolidayService(HolidayRepository holidayRepository) {
        this.holidayRepository = holidayRepository;
    }

    @Transactional(readOnly = true)
    public List<HolidayResponse> listAll() {
        return holidayRepository.findAllByOrderByDateAsc()
                .stream()
                .map(HolidayResponse::from)
                .toList();
    }

    @Transactional
    public HolidayResponse create(HolidayRequest request) {
        assertDateAvailable(request, null);

        Holiday holiday = new Holiday();
        holiday.setId(UUID.randomUUID());
        holiday.setCreatedAt(OffsetDateTime.now());
        apply(holiday, request);

        return HolidayResponse.from(holidayRepository.saveAndFlush(holiday));
    }

    @Transactional
    public HolidayResponse update(UUID id, HolidayRequest request) {
        Holiday holiday = find(id);

        assertDateAvailable(request, id);
        apply(holiday, request);

        return HolidayResponse.from(holidayRepository.saveAndFlush(holiday));
    }

    @Transactional
    public void delete(UUID id) {
        holidayRepository.delete(find(id));
    }

    private Holiday find(UUID id) {
        return holidayRepository.findById(id)
                .orElseThrow(() -> new HolidayNotFoundException(id));
    }

    private void assertDateAvailable(HolidayRequest request, UUID excludeId) {
        boolean taken = holidayRepository.findByDate(request.date())
                .filter(found -> !found.getId().equals(excludeId))
                .isPresent();

        if (taken) {
            throw new DuplicateHolidayDateException(request.date());
        }
    }

    private void apply(Holiday holiday, HolidayRequest request) {
        String location = request.location() == null
                ? null
                : request.location().trim();

        holiday.setDate(request.date());
        holiday.setName(request.name().trim());
        holiday.setScope(request.scope());
        holiday.setLocation(location == null || location.isEmpty() ? null : location);
    }
}
