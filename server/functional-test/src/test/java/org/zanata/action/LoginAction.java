/*
 * Copyright 2010 Google Inc.
 * 
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 * 
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */
package org.zanata.action;

import org.junit.Test;
import org.openqa.selenium.WebDriver;
import org.zanata.page.SignInPage;

import static org.hamcrest.MatcherAssert.*;
import static org.hamcrest.Matchers.equalTo;

public class LoginAction
{

   @Test
   public void canSignIn()
   {
      System.getProperties().put("webdriver.firefox.useExisting", "true");

      WebDriver driver = new WebDriverFactory().getDriver();

      driver.get("http://localhost:8080/zanata");

      String title = new SignInPage(driver).getTitle();
      assertThat(title, equalTo("Zanata:Log in"));
   }


}
