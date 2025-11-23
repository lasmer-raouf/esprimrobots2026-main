import * as React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

const InputGroup = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
    return (
        <div
            ref={ref}
            className={cn("flex items-center w-full", className)}
            {...props}
        />
    )
})
InputGroup.displayName = "InputGroup"

const InputGroupInput = React.forwardRef<
    HTMLInputElement,
    React.ComponentProps<typeof Input>
>(({ className, ...props }, ref) => {
    return (
        <Input
            ref={ref}
            className={cn(
                "rounded-r-none focus-visible:z-10",
                className
            )}
            {...props}
        />
    )
})
InputGroupInput.displayName = "InputGroupInput"

const InputGroupTextarea = React.forwardRef<
    HTMLTextAreaElement,
    React.ComponentProps<typeof Textarea>
>(({ className, ...props }, ref) => {
    return (
        <Textarea
            ref={ref}
            className={cn(
                "rounded-r-none focus-visible:z-10",
                className
            )}
            {...props}
        />
    )
})
InputGroupTextarea.displayName = "InputGroupTextarea"

const InputGroupButton = React.forwardRef<
    HTMLButtonElement,
    React.ComponentProps<typeof Button>
>(({ className, ...props }, ref) => {
    return (
        <Button
            ref={ref}
            className={cn(
                "rounded-l-none -ml-px focus-visible:z-10",
                className
            )}
            {...props}
        />
    )
})
InputGroupButton.displayName = "InputGroupButton"

export { InputGroup, InputGroupInput, InputGroupTextarea, InputGroupButton }
