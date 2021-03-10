import { render, html } from "lit-html";
import SuperComponent from "@codewithkyle/supercomponent";
import { diceware } from "./diceware";

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
        if (this.model.value.length !== 5){
            input.setCustomValidity("You must provide 5 numbers between the values of 1 and 6.");
        } else if (this.checkNumbers()) {
            input.setCustomValidity("Values must be between 1 and 6.");
        } else {
            input.setCustomValidity("");
        }
        input.reportValidity();
    }

    private async getNumbers(){
        try {
            const request = await fetch("https://qrng.anu.edu.au/API/jsonI.php?length=10&type=uint16&size=1");
            const resonse = await request.json();
            const data = `${resonse.data.join("")}`;
            return data;
        } catch (e){
            let data = "";
            for (let i = 1; i <= 5; i++){
                data += this.getRandomInt(1, 6);
            }
            return data;
        }
    }

    private generateNumbers:EventListener = () => {
        const data = this.getNumbers();
        const updatedModel = {...this.model};
        updatedModel.value = "";
        for (let i = 0; i < data.length; i++){
            const value = parseInt(data[i]);
            if (!isNaN(value) && value >= 1 && value <= 6){
                updatedModel.value += `${value}`;
            }
            if (updatedModel.value.length === 5){
                break;
            }
        }
        if (updatedModel.value.length < 5){
            const difference = 5 - updatedModel.value.length;
            for (let i = 1; i <= difference; i++){
                updatedModel.value += `${this.getRandomInt(1, 6)}`;
            }
        }
        this.update(updatedModel);
    }

    private getRandomInt(min:number, max:number):number {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    render(){
        const view = html`
            <div style="display:block;">
                <input class="${this.state === "INVALID" ? "is-invalid" : "is-valid"}" required type="number" value="${this.model.value}" @input=${this.handleInput} @blur=${this.handleBlur}>
                <button @click=${this.generateNumbers}>Roll for me</button>
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
        }
        this.render();
    }

    private addInput:EventListener = ()=>{
        this.update({inputs: this.model.inputs + 1});
    }

    private lookup(key:string): string{
        return diceware[key];
    }

    private generate:EventListener = () => {
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

    render(){
        let view;
        switch(this.state){
            case "SEPARATOR":
                view = html`
                    <label for="separator">Select A Separator:</label>
                    <select @change=${this.setSeparator} required id="separator">
                        <option value=" ">Space</option>
                        <option value="-">Hyphen</option>
                        <option value="_">Underscore</option>
                        <option value="">No Separator</option>
                    </select>
                    <button @click=${this.next}>Next</button>
                `;
                break;
            case "INPUT":
                view = html`
                    ${Array.from(Array(this.model.inputs)).map(() => {
                        return html`<input-component></input-component>`;
                    })}
                    <button @click=${this.addInput}>Add Input</button>
                    <button @click=${this.generate}>Generate Password</button>
                `;
                break;
            case "OUTPUT":
                view = html`<input type="text" readonly value="${this.model.password}">`;
                break;
        }
        render(view, this);
    }
}
customElements.define("password-generator", PasswordGenerator);