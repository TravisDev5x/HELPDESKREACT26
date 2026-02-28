<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class NewEmployeePendingApprovalMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $newEmployee
    ) {}

    public function build()
    {
        return $this->subject('Nuevo empleado pendiente de aprobación – HelpDesk')
            ->view('emails.new-employee-pending-approval')
            ->with([
                'employeeName' => $this->newEmployee->name,
                'employeeNumber' => $this->newEmployee->employee_number,
            ]);
    }
}
