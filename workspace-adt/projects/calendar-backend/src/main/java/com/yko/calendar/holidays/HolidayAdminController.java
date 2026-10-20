package com.yko.calendar.holidays;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin/holidays")
public class HolidayAdminController {

    private final HolidayService holidayService;

    public HolidayAdminController(HolidayService holidayService) {
        this.holidayService = holidayService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public HolidayResponse create(@Valid @RequestBody HolidayRequest request) {
        return holidayService.create(request);
    }

    @PutMapping("/{id}")
    public HolidayResponse update(
            @PathVariable UUID id,
            @Valid @RequestBody HolidayRequest request
    ) {
        return holidayService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        holidayService.delete(id);
    }
}
