import { render, html } from "lit-html";
import SuperComponent from "@codewithkyle/supercomponent";
import diceware from "./diceware";
import { refresh } from "tooltipper";
import { snackbar } from "@codewithkyle/notifyjs";

type InputComponentDataModel = {
    value: string;
}
type InputComponentState = "INACTIVE" | "INVALID" | "VALID" | "ERROR";
class InputComponent extends SuperComponent<InputComponentDataModel, InputComponentState>{
    constructor(){
        super();
        this.state = "INACTIVE";
        this.stateMachine = {
            INACTIVE: {
                ACTIVATE: "INVALID",
            },
            INVALID: {
                TOGGLE: "VALID",
            },
            VALID: {
                TOGGLE: "INVALID",
            },
        }
        this.model = {
            value: "",
        };
        this.trigger("ACTIVATE");
    }

    private handleInput:EventListener = (e:Event) => {
        const input = e.currentTarget as HTMLInputElement;
        input.setCustomValidity("");
        this.update({ value: input.value });
    }

    private checkNumbers(): boolean{
        let isInvalid = false;
        for (const value of this.model.value){
            const parsedValue = parseInt(value);
            if (isNaN(parsedValue) || parsedValue < 1 || parsedValue > 6){
                isInvalid = true;
                break;
            }
        }
        return isInvalid;
    }

    private handleBlur:EventListener = (e:Event) => {
        const input = e.currentTarget as HTMLInputElement;
        if(this.model.value.length === 5 && this.state === "INVALID" || this.model.value.length !== 5 && this.state === "VALID"){
            this.trigger("TOGGLE");
        }
        if (!input.classList.contains("is-invalid")){
            if (this.model.value.length !== 5){
                input.setCustomValidity("You must provide 5 numbers between the values of 1 and 6.");
            } else if (this.checkNumbers()) {
                input.setCustomValidity("Values must be between 1 and 6.");
            } else {
                input.setCustomValidity("");
            }
            input.reportValidity();
        }
    }

    private async getNumbers(){
        let data = "";
        try {
            const request = await fetch("https://qrng.anu.edu.au/API/jsonI.php?length=10&type=uint16&size=1");
            const resonse = await request.json();
            const temp = `${resonse.data.join("")}`;
            for (let i = 0; i < temp.length; i++){
                const value = parseInt(temp[i]);
                if (!isNaN(value) && value >= 1 && value <= 6){
                    data += `${value}`;
                }
                if (data.length === 5){
                    break;
                }
            }
        } catch (e){
            for (let i = 1; i <= 5; i++){
                data += this.getRandomInt(1, 6);
            }
        }
        return data;
    }

    private generateNumbers:EventListener = async () => {
        const button = this.querySelector("button");
        button.style.animation = "spin 600ms linear infinite";
        const updatedModel = {...this.model};
        updatedModel.value = await this.getNumbers();
        if (updatedModel.value.length < 5){
            const difference = 5 - updatedModel.value.length;
            for (let i = 1; i <= difference; i++){
                updatedModel.value += `${this.getRandomInt(1, 6)}`;
            }
        }
        button.style.animation = "none";
        this.update(updatedModel);
    }

    private getRandomInt(min:number, max:number):number {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    render(){
        const view = html`
            <div class="input">
                <input step="1" class="${this.state === "INVALID" ? "is-invalid" : "is-valid"}" required type="number" value="${this.model.value}" @input=${this.handleInput} @blur=${this.handleBlur}>
                <button type="button" @click=${this.generateNumbers} tooltip="Generate random numbers" class="bttn" kind="text" color="grey" shape="round" icon="center" style="top:calc((100% - 36px) * 0.5);position:absolute;right:0.5rem;">
                    <svg class="m-0" style="width:16px;height:16px;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>
        `;
        render(view, this);
    }
}
customElements.define("input-component", InputComponent);

type PasswordGeneratorModel = {
    inputs: number;
    words: Array<string>;
    password: string;
    separator: string;
};
type PasswordGeneratorState = "SEPARATOR" | "INPUT" | "OUTPUT";
class PasswordGenerator extends SuperComponent<PasswordGeneratorModel, PasswordGeneratorState>{
    constructor(){
        super();
        this.state = "SEPARATOR";
        this.model = {
            inputs: 1,
            words: [],
            password: null,
            separator: " ",
        }
        this.stateMachine = {
            SEPARATOR: {
                NEXT: "INPUT",
            },
            INPUT: {
                NEXT: "OUTPUT",
            },
            OUTPUT: {
                RESTART: "SEPARATOR",
            },
        }
        this.render();
    }

    private addInput:EventListener = ()=>{
        this.update({inputs: this.model.inputs + 1});
    }

    public removeInput(){
        this.update({inputs: this.model.inputs - 1});
    }

    private lookup(key:string): string{
        return diceware[key];
    }

    private generate:EventListener = (e:Event) => {
        e.preventDefault();
        const updatedModel = {...this.model};
        updatedModel.words = [];
        const inputs:Array<InputComponent> = Array.from(this.querySelectorAll("input-component"));
        inputs.map((input:InputComponent) => {
            updatedModel.words.push(this.lookup(input.model.value));
        });
        updatedModel.password = updatedModel.words.join(updatedModel.separator);
        this.update(updatedModel);
        this.trigger("NEXT");
    }

    private setSeparator: EventListener = (e:Event) => {
        const select = e.currentTarget as HTMLSelectElement;
        this.update({ separator: select.value });
    }

    private next:EventListener = ()=>{
        this.trigger("NEXT");
    }

    private restart:EventListener = () => {
        // @ts-ignore
        document?.activeElement?.blur();
        this.update({
            inputs: 1,
            words: [],
            password: null,
            separator: " ",
        });
        this.trigger("RESTART");
    }

    private copyToClipboard:EventListener = () => {
        if ('clipboard' in navigator) {
            navigator.clipboard.writeText(this.model.password).then(() => {
                snackbar({
                    message: "Password copied to clipboard.",
                    duration: 10,
                    force: true,
                    closeable: true,
                });
            });
        } else {
            const input = this.querySelector("input");
            input.select();
            input.setSelectionRange(0, 99999);
            document.execCommand("copy");
            snackbar({
                message: "Password copied to clipboard.",
                duration: 10,
                force: true,
                closeable: true,
            });
        }
    }

    private selectInputValue:EventListener = (e:Event) => {
        const input = e.currentTarget as HTMLInputElement;
        input.select();
        input.setSelectionRange(0, 99999);
    }

    render(){
        let view;
        switch(this.state){
            case "SEPARATOR":
                view = html`
                    <div class="select">
                        <label for="separator">Select A Separator:</label>
                        <select @change=${this.setSeparator} required id="separator">
                            <option value=" ">Space</option>
                            <option value="-">Hyphen</option>
                            <option value="_">Underscore</option>
                            <option value="">No Separator</option>
                        </select>
                        <i>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </i>
                    </div>
                    <button class="w-full bttn mt-1" kind="solid" color="primary" shape="rounded" icon="right" @click=${this.next}>
                        Next Step
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                    </button>
                `;
                break;
            case "INPUT":
                view = html`
                    <p class="block w-full text-center font-sm font-grey-700 mb-0.5 line-normal">Roll a six-sided die 5 times and enter the result of each roll into the input below. If you don't have dice or time, click the auto-roll button to have a quantum computer generate random numbers for you.</p>
                    <p class="block font-sm ${this.model.inputs < 5 ? "font-danger-600" : "font-grey-800"} text-center line-normal mb-1">For secure and rememberable passwords use at least 5 inputs.</p>
                    <form @submit=${this.generate} grid="columns 1 gap-1">
                        ${Array.from(Array(this.model.inputs)).map(() => {
                            return html`<input-component></input-component>`;
                        })}
                        <div class="w-full px-0.125" grid="columns 2 gap-1">
                            <button type="button" class="bttn" kind="solid" color="primary" shape="rounded" icon="left" @click=${this.addInput}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Add Input
                            </button>
                            <button type="submit" class="bttn" kind="solid" color="success" shape="rounded" icon="left">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Generate Password
                            </button>
                        </div>
                    </form>
                `;
                break;
            case "OUTPUT":
                view = html`
                    <div class="input">
                        <input type="text" readonly value="${this.model.password}" autofocus @focus=${this.selectInputValue}>
                        <button @click=${this.copyToClipboard} class="bttn" kind="text" color="grey" shape="round" icon="center" tooltip="Copy to clipboard" flex="items-center justify-center" style="width:36px;height:36px;position:absolute;top:calc((100% - 36px) * 0.5);right:0.5rem">
                            <svg style="width:18px;height:18px;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                            </svg>
                        </button>
                    </div>
                    <button class="w-full bttn mt-1" kind="solid" color="primary" shape="rounded" icon="left" @click=${this.restart}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Restart
                    </button>
                `;
                break;
        }
        render(view, this);
        if (this.state === "OUTPUT"){
            setTimeout(() => {
                const input = this.querySelector("input");
                if (input){
                    input.focus();
                    input.select();
                }
            }, 75);
        }
    }
}
setInterval(() => {
    refresh();
}, 1000);
customElements.define("password-generator", PasswordGenerator);