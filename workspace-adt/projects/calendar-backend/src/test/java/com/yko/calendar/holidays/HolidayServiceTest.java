package com.yko.calendar.holidays;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class HolidayServiceTest {

    private static final LocalDate DATE = LocalDate.of(2026, 12, 25);

    private HolidayRepository repository;
    private HolidayService service;

    @BeforeEach
    void setUp() {
        repository = mock(HolidayRepository.class);
        service = new HolidayService(repository);

        when(repository.saveAndFlush(any(Holiday.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(repository.findByDate(any(LocalDate.class)))
                .thenReturn(Optional.empty());
    }

    private Holiday holiday(LocalDate date) {
        Holiday holiday = new Holiday();
        holiday.setId(UUID.randomUUID());
        holiday.setDate(date);
        holiday.setName("Navidad");
        holiday.setScope(HolidayScope.NATIONAL);
        return holiday;
    }

    private HolidayRequest request(LocalDate date, String location) {
        return new HolidayRequest(date, " Nombre ", HolidayScope.LOCAL, location);
    }

    @Test
    void createTrimsFieldsAndStoresBlankLocationAsNull() {
        HolidayResponse response = service.create(request(DATE, "   "));

        assertEquals("Nombre", response.name());
        assertEquals(DATE, response.date());
        assertEquals(HolidayScope.LOCAL, response.scope());
        assertNull(response.location());
    }

    @Test
    void createKeepsTrimmedLocation() {
        assertEquals("Toledo", service.create(request(DATE, " Toledo ")).location());
    }

    @Test
    void createWithTakenDateFails() {
        when(repository.findByDate(DATE))
                .thenReturn(Optional.of(holiday(DATE)));

        assertThrows(
                DuplicateHolidayDateException.class,
                () -> service.create(request(DATE, null))
        );
        verify(repository, never()).saveAndFlush(any());
    }

    @Test
    void updateKeepingOwnDateIsAllowed() {
        Holiday existing = holiday(DATE);
        when(repository.findById(existing.getId()))
                .thenReturn(Optional.of(existing));
        when(repository.findByDate(DATE)).thenReturn(Optional.of(existing));

        HolidayResponse response = service.update(existing.getId(), request(DATE, null));

        assertEquals("Nombre", response.name());
    }

    @Test
    void updateToFreeDateMovesTheHoliday() {
        Holiday existing = holiday(DATE);
        LocalDate newDate = LocalDate.of(2026, 12, 26);
        when(repository.findById(existing.getId()))
                .thenReturn(Optional.of(existing));

        assertEquals(
                newDate,
                service.update(existing.getId(), request(newDate, null)).date()
        );
    }

    @Test
    void updateToDateTakenByAnotherHolidayFails() {
        Holiday existing = holiday(DATE);
        LocalDate other = LocalDate.of(2026, 12, 26);
        when(repository.findById(existing.getId()))
                .thenReturn(Optional.of(existing));
        when(repository.findByDate(other)).thenReturn(Optional.of(holiday(other)));

        assertThrows(
                DuplicateHolidayDateException.class,
                () -> service.update(existing.getId(), request(other, null))
        );
    }

    @Test
    void updateUnknownHolidayFails() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.empty());

        assertThrows(
                HolidayNotFoundException.class,
                () -> service.update(id, request(DATE, null))
        );
    }

    @Test
    void deleteRemovesTheHoliday() {
        Holiday existing = holiday(DATE);
        when(repository.findById(existing.getId()))
                .thenReturn(Optional.of(existing));

        service.delete(existing.getId());

        verify(repository).delete(existing);
    }

    @Test
    void deleteUnknownHolidayFails() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.empty());

        assertThrows(HolidayNotFoundException.class, () -> service.delete(id));
    }

    @Test
    void listReturnsHolidaysInRepositoryOrder() {
        when(repository.findAllByOrderByDateAsc())
                .thenReturn(List.of(holiday(DATE)));

        assertEquals(1, service.listAll().size());
    }

    @Test
    void requestRejectsYearsOutOfRange() {
        assertTrue(request(DATE, null).isDateInRange());
        assertTrue(!request(LocalDate.of(1999, 1, 1), null).isDateInRange());
        assertTrue(!request(LocalDate.of(2101, 1, 1), null).isDateInRange());
    }
}
