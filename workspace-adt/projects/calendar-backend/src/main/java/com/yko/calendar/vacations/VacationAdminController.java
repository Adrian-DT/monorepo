package com.yko.calendar.vacations;

import com.yko.calendar.auth.AuthenticatedUser;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin/vacations")
public class VacationAdminController {

    private final VacationService vacationService;

    public VacationAdminController(VacationService vacationService) {
        this.vacationService = vacationService;
    }

    @PostMapping("/{id}/decision")
    public VacationResponse decide(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID id,
            @Valid @RequestBody VacationDecisionRequest request
    ) {
        return vacationService.decide(principal.getUser(), id, request);
    }
}
